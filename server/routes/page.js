// 引入上一步创建的model
const mongoose = require('mongoose');
const Page = require('../models/page');
const router = require('koa-router')()
const fs = require('fs')
const path = require('path')


/**
 * 页面访问地址
 */
router.get('/view/:_id', async ctx=> {
	let _id = mongoose.mongo.ObjectId(ctx.params._id)
	let page = await Page.findOne({_id})
	ctx.status = 201;
	// todo 根据不同type渲染不同得模板引擎
	await ctx.render('h5-swiper',{pageData: page})
})
var archiver = require('archiver');
var send = require('koa-send');

router.get('/download/:_id', async ctx=> {
	let _id = mongoose.mongo.ObjectId(ctx.params._id)
	let page = await Page.findOne({_id})
	ctx.status = 200;
	// todo 根据不同type渲染不同得模板引擎
	

	
	var output = fs.createWriteStream(__dirname + '/../example.zip');
	var archive = archiver('zip', {
	  zlib: { level: 9 } // Sets the compression level.
	});
	
	// listen for all archive data to be written
	// 'close' event is fired only when a file descriptor is involved
	let r;
	var result = new Promise((resolve) => {
		r = resolve;
	})
	output.on('close', async() => {
	  console.log(archive.pointer() + ' total bytes');
	  console.log('archiver has been finalized and the output file descriptor has closed.');

	
	  let path = './server/example.zip';
	  ctx.attachment(path)
  
	  await send(ctx, path);

	  r()
	});
	
	// This event is fired when the data source is drained no matter what was the data source.
	// It is not part of this library but rather from the NodeJS Stream API.
	// @see: https://nodejs.org/api/stream.html#stream_event_end
	output.on('end', function() {
	  console.log('Data has been drained');


	});
	
	// good practice to catch warnings (ie stat failures and other non-blocking errors)
	archive.on('warning', function(err) {
	  if (err.code === 'ENOENT') {
		// log warning
	  } else {
		// throw error
		throw err;
	  }
	});
	
	// good practice to catch this error explicitly
	archive.on('error', function(err) {
	  throw err;
	});
	
	// pipe archive data to the file
	archive.pipe(output);
	
	// append a file from stream
	var file1 = __dirname + '/../template/index.htm';
	archive.append(fs.createReadStream(file1), { name: 'index.htm' });

	file1 = __dirname + '/../template/res/vue.js';
	archive.append(fs.createReadStream(file1), { name: 'res/vue.js' });
	file1 = __dirname + '/../template/res/animate.min.css';
	archive.append(fs.createReadStream(file1), { name: 'res/animate.min.css' });
	file1 = __dirname + '/../template/res/h5-swiper.css';
	archive.append(fs.createReadStream(file1), { name: 'res/h5-swiper.css' });
	file1 = __dirname + '/../template/res/h5-swiper.umd.js';
	archive.append(fs.createReadStream(file1), { name: 'res/h5-swiper.umd.js' });
	file1 = __dirname + '/../template/res/swiper.min.css';
	archive.append(fs.createReadStream(file1), { name: 'res/swiper.min.css' });
	file1 = __dirname + '/../template/res/swiper.min.js';
	archive.append(fs.createReadStream(file1), { name: 'res/swiper.min.js' });
	file1 = __dirname + '/../template/res/tracker.min.js';
	archive.append(fs.createReadStream(file1), { name: 'res/tracker.min.js' });

	var json = JSON.stringify(page);
	
	archive.append(`window._pageData = ${json}`, { name: 'data.js' });

	// archive.directory('subdir/', false);

	archive.glob('../template/*.*');

	archive.finalize();

	// ctx.append('Content-Disposition', 'attachment;filename=example.zip');
	await result
})

/**
 * 获取所有page
 */
router.get('/myPages', async ctx=> {
	let author = ctx.state.user._id;
	author = mongoose.mongo.ObjectId(author)
	if(ctx.query.type === 'share'){
		ctx.body = await Page.find({isTemplate: { $ne: true }, members:{$elemMatch: {$in: author}}})
		return
	}
	ctx.body = await Page.find({author: author}).ne('isTemplate', true)
})

router.get('/myPages/count', async ctx => {
	let author = ctx.state.user._id;
	author = mongoose.mongo.ObjectId(author)
	let myList = await Page.find({author: author}).ne('isTemplate', true)
	let shareList = await Page.find({isTemplate: { $ne: true }, members:{$elemMatch: {$in: author}}})
	ctx.body = {
		my: myList.length,
		share: shareList.length
	}
})


/**
 * 查找某一页页面数据
 */
router.get('/detail/:_id', async ctx=> {
	let _id = mongoose.mongo.ObjectId(ctx.params._id)
	ctx.body = await Page.findOne({_id})
})

/**
 * 新增页面
 */
router.post('/add', async ctx=> {
	let data = ctx.request.body
	let author = ctx.state.user._id;
	ctx.body = await Page.create({
		...data,
		author: author,
		_id: mongoose.mongo.ObjectId()
	})
})

/**
 * 复制页面
 */
router.post('/copy/:_id', async ctx=> {
	let _id = mongoose.mongo.ObjectId(ctx.params._id)
	let data = await Page.findOne({_id})
	ctx.body = await Page.create({
		...data.toObject(),
		isPublish: false,
		isTemplate: false,
		members: [],
		_id: mongoose.mongo.ObjectId()
	})
})

/**
 * 修改页面
 */
router.post('/update/:_id', async ctx=> {
	let _id = mongoose.mongo.ObjectId(ctx.params._id)
	let data = ctx.request.body
	ctx.body = await Page.updateOne({_id}, { $set: data }, {
		runValidators: true
	})
})

/**
 * 删除页面
 */
router.delete('/delete/:_id', async ctx=> {
	let _id = mongoose.mongo.ObjectId(ctx.params._id)
	ctx.body = await Page.deleteOne({_id})
})


/**
 * 设为模板
 */
router.post('/setTemplate/:_id', async ctx => {
	let _id = mongoose.mongo.ObjectId(ctx.params._id)
	let data = await Page.findOne({_id})
	ctx.body = await Page.create({
		...data.toObject(),
		isTemplate: true,
		isPublish: false,
		members: [],
		_id: mongoose.mongo.ObjectId()
	})
})

/**
 * 获取我的模板
 */
router.get('/myTemplate', async ctx=> {
	let author = ctx.state.user._id;
	author = mongoose.mongo.ObjectId(author)
	ctx.body = await Page.find({author: author}).where('isTemplate').equals(true).where('isPublish').equals(false)
})

/**
 * 发布页面
 */
router.post('/publish/:_id', async ctx=> {
	let _id = mongoose.mongo.ObjectId(ctx.params._id)
	ctx.body = await Page.updateOne({_id}, { $set: {isPublish: true} }, {
		runValidators: true
	})
})
/**
 * 添加协同开发人员
 */
router.post('/shareToUser/:_id', async ctx=> {
	let _id = mongoose.mongo.ObjectId(ctx.params._id)
	let data = ctx.request.body
	ctx.body = await Page.updateOne({_id}, { $push: {members: data.userIds} }, {
		runValidators: true
	})
})
/**
 * 删除协同开发人员
 */
router.post('/deleteShareToUser/:_id', async ctx=> {
	let _id = mongoose.mongo.ObjectId(ctx.params._id)
	let author = ctx.state.user._id;
	ctx.body = await Page.updateOne({_id}, { $pull: {members: author} }, {
		runValidators: true
	})
})

/**
 * 发布模板到模板市场
 */
router.post('/publishTemplate/:_id', async ctx=> {
	let _id = mongoose.mongo.ObjectId(ctx.params._id)
	let data = await Page.findOne({_id})
	ctx.body = await Page.create({
		...data.toObject(),
		isTemplate: true,
		isPublish: true,
		members: [],
		_id: mongoose.mongo.ObjectId()
	})
})

/**
 * 获取模板市场模板列表
 */
router.get('/templateShop/list', async ctx=> {
	ctx.body = await Page.find({}).where('isTemplate').equals(true).where('isPublish').equals(true)
})


module.exports = router
