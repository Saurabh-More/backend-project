import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/User.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


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

export {registerUser}