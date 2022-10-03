const Campground= require('../models/campground');
const {cloudinary} =require('../cloudinary');
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken })

module.exports.index=async(req,res)=>{
    const campgrounds = await Campground.find({});
    res.render('campgrounds/index',{campgrounds});
}

module.exports.renderNewForm = (req,res)=>{
    res.render('campgrounds/new');
}

module.exports.createCampground = async(req,res,next)=>{
    const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send();
    // console.log(geoData.body.features[0].geometry);
    const campground= new Campground(req.body.campground);
    campground.geometry = geoData.body.features[0].geometry
    campground.images= req.files.map(f => ({url : f.path, filename: f.filename}));
    campground.author = req.user._id;
    await campground.save();
    console.log(campground);
    req.flash('success', 'Successfully made a new Campground');
    res.redirect(`/campgrounds/${campground._id}`);
    // res.send('Encoded');
}
module.exports.showCampground = async(req,res)=>{
    // const id=res.params;
    const campground = await Campground.findById(req.params.id).populate({
        path: 'reviews',
        populate :{
            path: 'author'
        }}).
        populate('author');
    if(!campground){
        req.flash('error','Campground not found' );
        return res.redirect('/campgrounds');
    }
    // console.log(campground);
    res.render('campgrounds/show',{campground});
}

module.exports.renderEditForm = async(req,res)=>{
    const id=req.params.id;
    const campground = await Campground.findById(id);
    if(!campground){
        req.flash('error','Campground not found' );
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/edit',{campground});
}
module.exports.updateCampground = async(req,res)=>{
    //since we need the id again for database we are using :id otherwise it could have been normal route
    const {id}=req.params;
    // console.log(req.body);
    const camp = await Campground.findByIdAndUpdate(id,{...req.body.campground});
    const imgs= req.files.map(f => ({url : f.path, filename: f.filename}));
    camp.images.push(...imgs);
    if(req.body.deleteImages){
        for(let filename of req.body.deleteImages){
            await cloudinary.uploader.destroy(filename);
        }
        await camp.updateOne({$pull: {images: {filename: {$in: req.body.deleteImages}}}})
    }
    await camp.save();
    req.flash('success', 'Successfully updated the Campground');
    res.redirect(`/campgrounds/${camp._id}`);
}
module.exports.deleteCampground = async(req,res)=>{
    const id=req.params.id;
    await Campground.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted the Campground');
    res.redirect('/campgrounds');
}