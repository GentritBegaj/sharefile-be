"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const router = express_1.default.Router();
const File_1 = __importDefault(require("../models/File"));
const https_1 = __importDefault(require("https"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const createEmailTemplate_1 = __importDefault(require("./../utils/createEmailTemplate"));
const storage = multer_1.default.diskStorage({});
let upload = multer_1.default({
    storage,
});
router.post('/upload', upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res
                .status(400)
                .json({ message: 'There is no file selected to upload' });
        }
        let uploadedFile;
        try {
            uploadedFile = yield cloudinary_1.v2.uploader.upload(req.file.path, {
                folder: 'sharefile',
                resource_type: 'auto',
            });
        }
        catch (error) {
            console.log(error);
            return res.status(400).json({ message: 'Cloudinary error!' });
        }
        const { originalname } = req.file;
        const { secure_url, bytes, format } = uploadedFile;
        const file = yield File_1.default.create({
            filename: originalname,
            sizeInBytes: bytes,
            secure_url,
            format,
        });
        res.status(201).json({
            id: file._id,
            downloadLink: `${process.env.API_BASE_ENDPOINT_CLIENT}/download/${file._id}`,
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Generic Server Error' });
    }
}));
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const file = yield File_1.default.findById(id);
        if (!file)
            return res.status(404).json({ message: 'File does not exist' });
        const { filename, sizeInBytes, format } = file;
        return res.status(200).json({
            name: filename,
            sizeInBytes,
            id,
            format,
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Generic Server Error' });
    }
}));
router.get('/:id/download', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const file = yield File_1.default.findById(id);
        if (!file)
            return res.status(404).json({ message: 'File does not exist' });
        https_1.default.get(file.secure_url, (fileStream) => {
            fileStream.pipe(res);
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Generic Server Error' });
    }
}));
router.post('/email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, emailFrom, emailTo } = req.body;
    if (!id || !emailFrom || !emailTo)
        return res.status(400).json({ message: 'all fields are required' });
    const file = yield File_1.default.findById(id);
    if (!file) {
        return res.status(404).json({ message: `File does not exist` });
    }
    let transporter = nodemailer_1.default.createTransport({
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
        from: emailFrom,
        to: emailTo,
        subject: `Someone shared a file with you`,
        text: `${emailFrom} shared a file with you`,
        html: createEmailTemplate_1.default(emailFrom, filename, fileSize, downloadLink), // html body
    };
    transporter.sendMail(mailOptions, (error, info) => __awaiter(void 0, void 0, void 0, function* () {
        if (error) {
            console.log(error);
            return res.status(500).json({ message: `Generic Server Error` });
        }
        file.sender = emailFrom;
        file.receiver = emailTo;
        yield file.save();
        return res.status(200).json({ message: 'Email sent' });
    }));
}));
exports.default = router;
