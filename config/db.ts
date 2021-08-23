import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL!, {
      useCreateIndex: true,
      useNewUrlParser: true,
      useFindAndModify: true,
      useUnifiedTopology: true,
    });
  } catch (error) {
    console.log(error);
  }

  const connection = mongoose.connection;
  if (connection.readyState >= 1) {
    console.log('Connected to Database');
    return;
  }
  connection.on('error', () => console.log('Connection failed!'));
};

export default connectDB;
