//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require('lodash');//loadash for the _.lowerCase method
const fp = require('lodash/fp');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//connecting to mongo atlas
mongoose.connect("mongodb+srv://admin-leo:le123456@cluster0.jlegb.mongodb.net/todolistDB",
 {useNewUrlParser: true, useUnifiedTopology: true});

mongoose.set('useFindAndModify', false);

//creating schema
const itemsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Item did not have name"]
  }
});

//creating of model Item
const Item = mongoose.model("item", itemsSchema);

//creating standard docs
const item1 = new Item({
  name: "Make Food"
});
const item2 = new Item({
  name: "Eat Food"
});

const defaultItems = [item1,item2];
//====================================================================

//creation of new schema to be used with the express route parameters.
const listSchema = new mongoose.Schema(
{
  name: String,
  items:[itemsSchema]
});

//creation of new List catalog to be used with the express route parameters named "lists" and based on the listSchema schema.
const List = mongoose.model("list", listSchema);

//==========================================================================


app.get("/", function(req, res)
{
  Item.find({}, function(err, foundItems){ //finds all documents in collection
    if(foundItems.length===0){ //if the collection is without documents then it will add documents waiting to be added
      Item.insertMany(defaultItems, function(err)
      {
        if(err)
          {console.log(err);}
          else{
            console.log("items array was added");
          }
      });
      res.redirect("/") //refreshes the page so the 'else' statemant can be triggered
    } else{ //if collection is not empty, the collection will be displayied on the screen
      res.render("list", {
        listTitle: "Today",
        newListItems: foundItems});//the value of the 'name' inside each document will be displayied as written in the list.ejs code.
    }
  });
});


//------------- adding items documents to Item catalog using post request -------
app.post("/", function(req, res){

  const itemName = req.body.newItem; // catches the input from the user
  const listName= req.body.title;

  //creating a new document layout with the input from the user to be added to the collection
  const item = new Item({
    name: itemName
  });

  if(listName==="Today"){
    item.save(); //saves new item to the items collection.
    res.redirect("/"); //this redirect will make it so the code re-enters the .get method above and prints the new item on the screen with the 'else' statement.
  }else{
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/"+listName);
    });
  }
});

// --------- post request to delete items from Item catalog--------------------
app.post("/delete", function(req,res){
  const checkedItemId = req.body.checkbox; //this captures the value of the document _id from the list.ejs
  const listName = req.body.listName; //this captures the value of the input of type "hidden" from the list.ejs

  if(listName==="Today"){
    Item.findByIdAndRemove(checkedItemId, function(err){
      if(err){
        console.log(err);
      }else{
        console.log("Item was successfully removed");
        res.redirect("/");
      }
    });
  }else{
    List.findOneAndUpdate({name:listName},{$pull:{items:{_id:checkedItemId}}},function(err, foundList){
      if(!err){
        res.redirect("/"+ listName);
      }
    });
  }
});

//----------- express route parameters to get to different pages based on /name-----------------
app.get("/:customListName", function(req,res){
  const customListName = _.capitalize(req.params.customListName);
  console.log(customListName);

  List.findOne({name:customListName}, function(err, foundList){
      if(!err){
        if(!foundList){
          //create a new list if no list with customListName exist
          const list = new List({
            name: customListName,
            items: defaultItems
          });
          list.save();
          res.redirect("/" + customListName);
        }else{
          //show an existing list
          res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
        }
      }
    });
  });

app.get("/about", function(req, res){
  res.render("about");
});

//code for dynamic port for Heroku server
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started");
});
