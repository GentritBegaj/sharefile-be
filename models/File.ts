import mongoose, { Document } from 'mongoose';

const { Schema, model } = mongoose;

const FileSchema = new Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    secure_url: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      required: true,
    },
    sizeInBytes: {
      type: String,
      required: true,
    },
    sender: {
      type: String,
    },
    receiver: {
      type: String,
    },
  },
  { timestamps: true }
);

export interface IFile extends Document {
  filename: string;
  secure_url: string;
  format: string;
  sizeInBytes: string;
  sender?: string;
  receiver?: string;
}

export default model<IFile>('File', FileSchema);
