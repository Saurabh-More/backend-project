import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/User.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const options = {
    httpOnly : true,
    secure : true
}

// Make method for generating Tokens
const generateAccessAndRefreshToken = async(userId)=>{
    try
    {
        const user=await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken=refreshToken;

        await user.save({validateBeforeSave : false});

        return {accessToken,refreshToken}
    }
    catch(error)
    {
        throw new ApiError(500,"Something went wrong while generating Both Tokens")
    }
}

const registerUser=asyncHandler(async (req,res)=>{
    // get user details from fronted
    // validation - not empty
    // check if user already exist : username, email
    // check for images , check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in database
    // remove password and refresh token field from response
    // check for user creation 
    // return response


    // get user details from fronted
    const {fullName,email,username,password}=req.body;
    // console.log("req.body : ");
    // console.log(req.body);
    

    // Validation - not empty
    if (!fullName || !email || !username || !password) 
    {
        throw new ApiError(400, "All fields are required");
    }

    // check if user already exist : username, email
    const existedUserByUsername=await User.findOne({username});
    const existedUserByEmail=await User.findOne({email});
    if(existedUserByUsername || existedUserByEmail)
    {
        throw new ApiError(409,"User with this username or email already exists");
    }
    

    // check for images , check for avatar
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if(req.files?.coverImage)
    {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required");
    }
    // console.log("req.files : ");
    // console.log(req.files);

    // upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        // again check for avatar is uploaded or not
    if(!avatar)
    {
        throw new ApiError(400,"Avatar file is required");
    }

    // create user object - create entry in database
    const user = await User.create({
        fullName,
        email,
        password,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        username:username.toLowerCase()
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    
    
    // check for user creation
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user");
    }


    // return response
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully"));
});

const loginUser = asyncHandler(async (req,res) =>{
    // Get data From the req.body
    // username or email are required
    // password also required
    // find the user on the database ny username or email
    // check password
    // generate access ans refresh tokens
    // add these tokens inside the cookies 
    // send response

    // get data 
    const {username,email,password} =req.body

    // check username or email is given
    if(!(username || email))
    {
        throw new ApiError(400,"Username or email are required");
    }

    // check password is given 
    if(!password)
    {
        throw new ApiError(400,"Password required");
    }

    // find user is exist of given username or email
    const user=await User.findOne({
        $or:[{email},{username}]
    });
    if(!user)
    {
        throw new ApiError(404,"User does not exist.");
    }

    // check password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid)
    {
        throw new ApiError(401,"Password is incorrect.");
    }

    // generate access ans refresh tokens
    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);

    //update the user with tokens
    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken");

    // add these tokens inside the cookies 
    // return response
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User Logged in Successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req,res) =>{
    
    // now to update the refresh token 
    await User.findByIdAndUpdate(req.user._id,
        {
           $set:{
            refreshToken:undefined
           } 
        },
        {
            new:true
        }
    )

    // now update the cookies and send respond
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
})

const  refreshAccessToken = asyncHandler(async (req,res)=>{
    // get refresh token from cookies
    const incomingRefreshToken =req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken)
    {
        throw new ApiError(401,"Unauthorized request");
    }

    try 
    {
        // decode the incoming token 
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
    
        // in the decoded token you get _id 
        const user= await User.findById(decodedToken._id);
    
        if(!user)
        {
            throw new ApiError(401,"Invalid refresh Token");
        }
    
        // check the refresh token with database refresh token 
        if(incomingRefreshToken !== user?.refreshToken)
        {
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        // now generate the tokens 
        const {accessToken,newrefreshToken}=await generateAccessAndRefreshToken(user._id);
    
        // now sent the responce
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(new ApiResponse(
            200,
            {accessToken,refreshToken:newrefreshToken},
            "The new Access token is generated using refresh token and refresh token is updates"
        ))
    } 
    catch (error) 
    {
        throw new ApiError(401,error?.message || "Invalid refresh Token")   
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    // Get new Password ans old password from user 
    const {oldPassword,newPassword} = req.body
    
    // newPassword and old password is required is required
    if(!newPassword && !oldPassword)
        {
            throw new ApiError(401,"Password is Required");
        }
        
        // Access user using the request in which user property is added inside the middleware  
        const user = await User.findById(req.use?._id);
        
        // check the user provide correct old password
        const isPasswordCorrect =  await user.isPasswordCorrect(oldPassword); 
        if(!isPasswordCorrect)
            {
                throw new ApiError(400,"Invalid Old password")
            }
            
            user.password=newPassword;
            await user.save({validateBeforeSave:false})
            
            return res
            .status(200)
            .json(new ApiResponse(200,{},"Password Changes Successfully"))
})
             
const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"Current user Fetched Successfully"))      
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const { fullName,email } = req.body;

    if(!fullName || !email)
    {
        throw new ApiError(400,"All fields are required");
    }

    const user=User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName:fullName,
                email:email
            }
        },
        {
            new :true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})
        
const  updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar File is missing")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url)
    {
        throw new ApiError(400,"Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{avatar:avatar.url}
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar updated Successfully"))
})

       
const  updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath)
    {
        throw new ApiError(400,"Cover Image file  is missing")
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url)
    {
        throw new ApiError(400,"Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{coverImage:coverImage.url}
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image is Updated successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}