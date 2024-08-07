import dotenv from "dotenv"
dotenv.config();

import express from 'express';
import connectDB from './db/index.js';

connectDB()
.then(()=>{

    // app.on("error",(error)=>{
    //     console.log("ERROR : ",error);
    //     throw error
    // })

    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGO db connection failed !!! ",err); 
})