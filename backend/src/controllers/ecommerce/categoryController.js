import express from 'express';
import Category from '../../models/ecommerceModels/category.js';

export const getCategoryController =  async (req, res) => {

    try{
    const categories = await Category.find();
    res.status(200).json(categories);

    }catch(err){
      return res.status(500).json({ error: err.message });}    

}




export const postCategoryController =  async (req, res) => {

    try{
    const category_posted = req.body;
    const new_category = new Category(category_posted);
    await new_category.save();
    console.log(new_category);
    res.status(201).json(new_category);

    }catch(err){
      return res.status(500).json({ error: err.message });}   

}

export const putCategoryController =  async (req, res) => {

    try{
    const {id} = req.params;
    const category_updates = req.body;
    const updated_category =  await Category.findByIdAndUpdate(id, category_updates, {new: true});  

    if (!updated_category) {
        return res.status(404).json({ error: "Category not found" });
      }
    console.log(updated_category);
    res.status(200).json(updated_category);

    }catch(err){
      return res.status(500).json({ error: err.message });}   

}






export const deleteCategoryController =  async (req, res) => {

  try{
    const {id} = req.params;
    const deleted_category = await Category.findByIdAndDelete(id);

    if (!deleted_category){
      return res.status(404).json({ message: "Category not found" });
      }
      console.log(deleted_category);
      return res.status(200).json({ message: "Category deleted successfully" });
  }
  catch (err){
    return res.status(500).json({ error: err.message });}
}

