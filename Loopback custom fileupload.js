'use strict';
var { google } = require("googleapis");
var drive = google.drive("v3");
var multer = require('multer');
var fs = require('fs');
var path = require('path');
var http = require('http');
module.exports = function (Googlestorage) {
	 var jwToken = new google.auth.JWT(
        "",
        null,
        "",
        null
    );
    jwToken.authorize((authErr) => {
        if (authErr) {
            console.log("error : " + authErr);
            return;
        } else {
            console.log("Authorization accorded");
        }
    });
var serverFile = { LocalFile: '', OriginalName: '', MimeType: '' };
    var storage = multer.diskStorage({
        destination: function (req, file, cb) {
            // checking and creating uploads folder where files will be uploaded
            var dirPath = 'client/uploads/'
            if (!fs.existsSync(dirPath)) {
                var dir = fs.mkdirSync(dirPath);
            }
            cb(null, dirPath + '/');
        },
        filename: function (req, file, cb) {
            // file will be accessible in `file` variable
            var ext = file.originalname.substring(file.originalname.lastIndexOf("."));
            var fileName = Date.now() + ext;
            serverFile.LocalFile = fileName;
            serverFile.OriginalName = file.originalname;
            serverFile.MimeType = file.mimetype;
            cb(null, serverFile.LocalFile);
        }
    });

    Googlestorage.FileUpload = async function (req, res, cb) {
        console.log(req.params.parentfolder);
        var upload = multer({
            storage: storage
        }).array('file', 12);

        upload(req, res, async function (err) {
            if (err) {
                // An error occurred when uploading
                res.end(err);
            }
            else {
                var uploadpath = path.join(__dirname, '../../client/uploads', serverFile.LocalFile);
                var result = await new Promise((resolve, reject) => {
                    var fileMetadata = {
                        'name': serverFile.OriginalName,
                        parents: [req.params.parentfolder]
                    };
                    var media = {
                        mimeType: serverFile.MimeType,
                        body: fs.createReadStream(uploadpath)
                    };
                    drive.files.create({
                        auth: jwToken,
                        requestBody: fileMetadata,
                        media: media,
                        fields: 'id'
                    }).then(function (file) {
                        resolve(file.data.id);
                    }).catch(function (err) {
                        reject(err);
                    })
                });
                fs.unlink(uploadpath, (err) => {
                    if (err) throw err;
                });
                res.end(result);
            }
        });
    }
    Googlestorage.remoteMethod(
        'FileUpload', {
            http: { path: '/fileupload/:parentfolder', verb: 'post' },
            accepts:
                [{
                    arg: 'req',
                    type: 'object',
                    http: {
                        source: 'req'
                    }
                }, {
                    arg: 'res',
                    type: 'object',
                    http: {
                        source: 'res'
                    }
                }
                ],
            returns: {
                arg: 'data',
                type: 'string',
                root: true
            }
        });
};