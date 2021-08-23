import express from 'express';
import multer from 'multer';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
const router = express.Router();
import FileModel from '../models/File';
import https from 'https';
import nodemailer from 'nodemailer';
import createEmailTemplate from './../utils/createEmailTemplate';

const storage = multer.diskStorage({});

let upload = multer({
  storage,
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'There is no file selected to upload' });
    }

    let uploadedFile: UploadApiResponse;
    try {
      uploadedFile = await cloudinary.uploader.upload(req.file.path, {
        folder: 'sharefile',
        resource_type: 'auto',
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: 'Cloudinary error!' });
    }
    const { originalname } = req.file;
    const { secure_url, bytes, format } = uploadedFile;
    const file = await FileModel.create({
      filename: originalname,
      sizeInBytes: bytes,
      secure_url,
      format,
    });
    res.status(201).json({
      id: file._id,
      downloadLink: `${process.env.API_BASE_ENDPOINT_CLIENT}/download/${file._id}`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Generic Server Error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const file = await FileModel.findById(id);
    if (!file) return res.status(404).json({ message: 'File does not exist' });

    const { filename, sizeInBytes, format } = file;

    return res.status(200).json({
      name: filename,
      sizeInBytes,
      id,
      format,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Generic Server Error' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const file = await FileModel.findById(id);
    if (!file) return res.status(404).json({ message: 'File does not exist' });

    https.get(file.secure_url, (fileStream) => {
      fileStream.pipe(res);
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Generic Server Error' });
  }
});

router.post('/email', async (req, res) => {
  const { id, emailFrom, emailTo } = req.body;

  if (!id || !emailFrom || !emailTo)
    return res.status(400).json({ message: 'all fields are required' });

  const file = await FileModel.findById(id);

  if (!file) {
    return res.status(404).json({ message: `File does not exist` });
  }

  let transporter = nodemailer.createTransport({
    //@ts-ignore
    host: process.env.SENDINBLUE_SMTP_SERVER,
    port: process.env.SENDINBLUE_SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SENDINBLUE_SMTP_USER,
      pass: process.env.SENDINBLUE_SMTP_PASSWORD,
    },
  });

  const { filename, sizeInBytes } = file;

  const fileSize = `${(Number(sizeInBytes) / (1024 * 1024)).toFixed(2)} MB`;

  const downloadLink = `${process.env.API_BASE_ENDPOINT_CLIENT}/download/${id}`;

  const mailOptions = {
    from: emailFrom, // sender address
    to: emailTo, // list of receivers
    subject: `Someone shared a file with you`, // Subject line
    text: `${emailFrom} shared a file with you`, // plain text body
    html: createEmailTemplate(emailFrom, filename, fileSize, downloadLink), // html body
  };

  transporter.sendMail(mailOptions, async (error, info) => {
    if (error) {
      console.log(error);
      return res.status(500).json({ message: `Generic Server Error` });
    }

    file.sender = emailFrom;
    file.receiver = emailTo;

    await file.save();

    return res.status(200).json({ message: 'Email sent' });
  });
});

export default router;
