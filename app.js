
if(process.env.NODE_ENV !=="production"){
    require('dotenv').config();
}

const express =require('express');
const mongoose = require('mongoose');
const path=require('path');
const ExpressError = require('./utils/ExpressError'); 
const methodOverride = require('method-override');
const ejsMate= require('ejs-mate');
const campgroundRoutes =require('./routes/campgrounds');
const reviewRoutes =require('./routes/reviews');
const session = require('express-session');
const flash= require('connect-flash');
const app =express();
const passport = require('passport');
const LocalStrategy = require ('passport-local');
const User =require('./models/user');
const userRoutes =require('./routes/users');
const req = require('express/lib/request');
const helmet = require('helmet');

const mongoSanitize = require('express-mongo-sanitize');

mongoose.connect('mongodb://localhost:27017/yelp-camp',{
    useNewUrlParser: true,
    // useCreateIndex: true,
    useUnifiedTopology: true,
});

const db=mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", ()=>{
    console.log("Database connected");
})

app.engine('ejs',ejsMate);

app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));//so that if we run from any file views are available
app.use(express.static(path.join(__dirname,'public')));

app.use(express.urlencoded({extended:true}));//getting params from post route
app.use(methodOverride('_method'));

app.use(mongoSanitize());

const sessionConfig ={
    secret: 'thisshouldbeabettersecret',
    resave: false,
    saveUninitialized: true,
    cookie:{
        httpOnly : true,//adds extra security
        // secure: true,
        expires: Date.now() + 1000*60*60*24*7,
        maxAge: 1000*60*60*24*7,
    }
}
app.use(session(sessionConfig));
app.use(flash());

app.use(helmet());

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",//
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",//
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net/",
];
const connectSrcUrls = [
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/dm4okte1s/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));  

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    // console.log(req.session);
    res.locals.success =req.flash('success');//middleware so that success key flash is available everywhere
    res.locals.error =req.flash('error');
    res.locals.currentUser = req.user;
    next();
})

app.use('/campgrounds',campgroundRoutes);
app.use('/campgrounds/:id/reviews',reviewRoutes);
app.use('/',userRoutes);

app.get('/',(req,res)=>{
    res.render('home');
});

app.all('*',(req,res,next)=>{
   next(new ExpressError('Page Not Found', 404));
})
app.use((err,req,res,next)=>{
    const { statusCode=500}=err;
    if(!err.message)err.message='Something Went wrong';
    res.status(statusCode).render('error',{err});
})
app.listen(3000, ()=>{
    console.log('Serving on Port 3000');
});