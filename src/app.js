import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app=express()

app.use(cors({
    origin:process.env.CORRS_ORIGIN,
    credentials:true
}))


// To get data in JSON format
app.use(express.json({limit:"16kb"}))

// To get data from URL
app.use(express.urlencoded({extended:true,limit:"16kb"}))

// Any type  data is store in the public folder is required
app.use(express.static("public"))

// Use to access the user cookies ans set it 
app.use(cookieParser())

export default app