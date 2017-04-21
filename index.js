//Import dependencies
var ejs = require('ejs');
var electron = require('electron');
var fs = require('fs');
var mime = require('mime');
var path = require('path');
var pStat = require('pstat');
var url = require('url');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

//Import app
var app = electron.app;

//Main function
var ElectronEjs = function(data, options)
{
  this.data = data;
  this.options = options;

  //Check for undefined emit
  if(typeof this.emit === 'undefined')
  {
    //Throw error
    throw Error("This initialization is obsolete! Please look documentation for more informations.");

    //Exit
    return;
  }

  //Check data
  if(typeof this.data === 'undefined'){ this.data = {}; }

  //Check options
  if(typeof this.options === 'undefined'){ this.options = {}; }

  //App ready event
  app.on('ready', () =>
  {
    //Import protocol
    var protocol = electron.protocol;

    //Intercept the file protocol
    protocol.interceptBufferProtocol('file', (request, callback) =>
    {
      //Get the file
      var file = ParsePath(request.url);

      //Get the file extension
      var extension = path.extname(file);

      //Check if path exists and is a file
      pStat.isFile(file, (exists) =>
      {
        //Check if file doesn't exists
        if(exists === false)
        {
          //Emit error
          this.emit("error", "File not found!");

          //Return file not found
          return callback(-6);
        }

        //Check the extension
        if(extension === '.ejs')
        {
          //Add the path to options
          this.options.filename = file;

          //Render template function
          var renderTemplate = () =>
          {
            //Render the full file
            ejs.renderFile(file, this.data, this.options, (err, content) =>
            {
              //Check for error
              if(err)
              {
                //Emit error
                this.emit('error', err);

                //Unexpected error
                return callback(-9);
              }

              //Return the callback
              return callback({ data: new Buffer(content), mimeType: 'text/html' });
            });
          };

          //Check for event before render
          if(!this.emit('before-render', file, this.data, this.options, renderTemplate))
          {
            //Render the template
            renderTemplate();
          }
        }
        else
        {
          //Read the file content
          fs.readFile(file, (err, content) =>
          {
            //Check for error
            if(err)
            {
              //Emit error
              this.emit('error', err);

              //Generic failure
              return callback(-2);
            }

            //Return the callback with the file content
            return callback({ data: content, mimeType: mime.lookup(extension) });
          });
        }
      });
    });
  });

  //End ElectronEjs function
}

//Function to parse the path
function ParsePath(u)
{
  //Parse the url
  var p = url.parse(u);

  //Get the path name
  var pname = p.pathname;

  //Check for Windows
  if(process.platform === 'win32')
  {
    //Remove the first / from the path
    //https://github.com/jmjuanes/electron-ejs/pull/4#issuecomment-219254028
    pname = pname.substr(1);
  }

  //Sanitize URL. Spaces turn into `%20` symbols in the path and
  //throws a `File Not Found Event`. This fix allows folder paths to have
  //spaces in the folder name.
  //https://github.com/jmjuanes/electron-ejs/pull/9
  pname = pname.replace(/\s/g, ' ').replace(/%20/g, ' ');

  //Decode URL
  pname = decodeURI(pname);

  //Return the path name
  return pname;
}

//Inherit EventEmmiter to ElectronEjs
util.inherits(ElectronEjs, EventEmitter);

//Exports to node
module.exports = ElectronEjs;
