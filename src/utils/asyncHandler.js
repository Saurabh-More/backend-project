const asyncHandler=(requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }
}

export { asyncHandler }



/*
One of the methos is used 

const asynHandler= (fu) => async (req,res,next) => {
    try{
        await fu(req,res,next)
    }
    catch(error){
        res.status(err.code || 500).json({
            success:false,
            message:err.message
        })
    }
}
    */
