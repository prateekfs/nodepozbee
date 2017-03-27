(function(categories){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        categoriesSchema = new Schema({
            name : {
                type : String,
                required:  true
            }
        },{collection : "category"});

    categories.Model = mongoose.model("Categories",categoriesSchema)
})(module.exports);