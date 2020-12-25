const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const hbs = require('hbs');
const fs = require('fs');
const os = require('os');
const glob = require('glob');
const showdown = require('showdown');
const jsdom = require("jsdom");

const image2base64 = require('image-to-base64');
const _remove = require('lodash').remove;
const _some = require('lodash').some;
const _find = require('lodash').find;


getAllSubFolders = (baseFolder, folderList = []) => {

    let folders = readdirSync(baseFolder).filter(file => statSync(path.join(baseFolder, file)).isDirectory());

    folders.forEach(folder => {
        folderList.push(path.join(baseFolder, folder));
        this.getAllSubFolders(path.join(baseFolder, folder), folderList);
    });
}

const nodemailer = require('nodemailer');
const emailRoute = require('./emailRouter');


const port = process.env.PORT || 3000;
let app = express();

hbs.registerPartials(__dirname + '/views/partials');

app.set('view engine', 'hbs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const RELEASES_DIR = __dirname + "/releases";

app.use('/edit', emailRoute);

// app.use((req, res, next) => {
//     next();
// });

app.use(function (req, res, next) {
    let now = new Date().toString();
    let log = `${now}: ${req.method} ${req.url}`;

    console.log(log);

    fs.appendFile("server.log", log + "\n", (err) => {
        if (err) {
            console.log("Unable to append to server.log");
        }
    });

    res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Expose-Headers', 'Content-Length');
    res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');

    if (req.method === 'OPTIONS') {
        return res.send(200);
    } else {
        return next();
    }
});

// app.use((req, res, next) => {
//     res.render('maintenance.hbs');
// });

app.use(express.static(__dirname));

hbs.registerHelper('getCurrentYear', () => {
    return new Date().getFullYear();
});
hbs.registerHelper('screamIt', (text) => {
    return text.toUpperCase();
});

app.get("/", (req, res) => {
    console.log("<REQ> ", req.param);
    // res.render('email.html', {
    //     pageTitle: "Home Page",
    //     welcomeMsg: "Welcome to the NodeJS web-site!"
    // });

    res.render('index', { name: 'Tobi' }, function (err, html1) {
        console.log("<html> ", html1);
        // console.log("<err> ", err);
        return "html1" + html1;
    });
});

app.get("/bad", (req, res) => {
    console.log("bad <req.query> ", req.params);
    res.render('index', { name: 'Tobi' }, function (err, html1) {
        console.log("<html> ", html1);
        // console.log("<err> ", err);
        return "html1" + html1;
    });
});

app.get("/release/:date", (req, res) => {
    const urlDate = req.params.date;

    console.log("<urlDate> ", urlDate);

    const fileContent = fs.readFileSync(`${RELEASES_DIR}/${urlDate}.txt`, 'utf8');

    console.log("<fileContent> ", fileContent);

    const releasePageObj = {
        date: urlDate,
        content: fileContent
    };

    res.send(releasePageObj);
});

app.post("/save-release", (req, res) => {

    const release = req.body;

    console.log("<save-release req.body>", release);

    const allReleases = ReleasesIndex.save(release);

    res.send(allReleases);
});

app.post("/create-release", (req, res) => {

    const body = req.body;

    console.log("<create-release req.body>", body);

    const releaseTitle = body.title ? body.title : "Neues Release";
    const releaseDate = body.date
        ? body.date
        : newDate__YYYYMMDD();

    function newDate__YYYYMMDD() {
        const timeStamp = new Date();
        const formattedDate = `${timeStamp.getUTCFullYear()}.${timeStamp.getUTCMonth() + 1}.${timeStamp.getUTCDate()}`;
        console.log("newDate__YYYYMMDD > ", formattedDate);
        return formattedDate;
    }

    console.log("<create-release releaseDate>", releaseDate);

    const releaseObj = {
        title: releaseTitle,
        date: releaseDate,
        content: (body.date === null) && `# ${releaseTitle}`
    };

    const allReleases = ReleasesIndex.save(releaseObj);

    res.send(allReleases);
});
app.post("/remove-release", (req, res) => {

    const body = req.body;

    console.log("<remove-release req.body>", body);

    const allReleases = ReleasesIndex.remove(body);

    res.send(allReleases);
});


app.get("/fetch-all-releases", (req, res) => {
    const index_arr = ReleasesIndex.getIndex();

    res.send(index_arr);
});

app.get("/get-user-info", (req, res) => {
    const userInfo = os.userInfo();

    res.send(userInfo);
});


app.post("/send-email", (req, res) => {
    const emailData = req.body;

    console.log("emailData > ", emailData);

    sendEmail(emailData, res);

    // res.send();
});

function getAllReleaseTitles() {

    const index_arr = ReleasesIndex.getIndex();
    const title_arr = index_arr.map((v) => v.title);

    // const releaseFileNames = glob.sync(RELEASES_DIR + "/*.txt")
    //     .map(function (filePath, i) {
    //         releaseFiles = filePath.map((v, i) => {
    //             const pathParts = v.split("/");
    //             const releaseFileParts = pathParts[pathParts.length - 1].split("--");
    //             const releaseName = releaseFileParts[0];

    //             console.log('releaseName => ', releaseName);d

    //             return releaseName;
    //         });
    //     });

    // console.log('releaseIndexFileContent__json => ', releaseIndexFileContent__json);

    return title_arr;
}

// fs.writeFile("testOutput.json", JSON.stringify(json))

// function addReleaseToIndex(indexObj) {

//     indexObj.current && 
// }


const ReleasesIndex = {
    PATH: `${RELEASES_DIR}/index.json`,
    save(releaseObj) {
        try {
            fs.writeFileSync(`${RELEASES_DIR}/${releaseObj.date}.txt`, releaseObj.content);
            console.log(`The Release file "${releaseObj.title}" was saved.`);
        } catch (err) {
            console.error(err)
        }

        return this.appendToIndex({
            date: releaseObj.date,
            title: releaseObj.title
        });
    },
    remove(releaseObj) {
        try {
            fs.unlinkSync(`${RELEASES_DIR}/${releaseObj.date}.txt`);
            console.log(`The file for Release of "${releaseObj.title}" was removed.`);
        } catch (err) {
            console.error(err)
        }

        return this.removeFromIndex(releaseObj);
    },
    getIndex() {
        const releaseIndexFileContent = fs.readFileSync(this.PATH);
        const releaseIndexFileContent__json = JSON.parse(releaseIndexFileContent);
        return releaseIndexFileContent__json;
    },
    appendToIndex(releaseObj) {
        const index_arr = this.getIndex();
        const releaseDate = releaseObj.date;

        console.log("<add index_arr>: ", index_arr);

        var releaseExists = _some(index_arr, function (release) {
            return release.date === releaseDate;
        });

        console.log("<save releaseExists>: ", releaseExists);

        !releaseExists && index_arr.push(releaseObj);

        console.log("<add index_arr after>: ", index_arr);

        const index_arr__str = JSON.stringify(index_arr);

        fs.writeFileSync(this.PATH, index_arr__str, (err) => {
            if (err) {
                return console.log(err);
            }
            console.log("A new Release was added to index.json.");
        });

        return index_arr;
    },
    removeFromIndex(releaseObj) {
        const index_arr = this.getIndex();

        console.log("<remove index_arr>: ", index_arr);

        var removedIndexedEls = _remove(index_arr, function (v) {
            return v.date === releaseObj.date;
        });

        console.log("<remove removedIndexedEls>: ", removedIndexedEls);
        console.log("<remove index_arr after>: ", index_arr);

        const index_arr__str = JSON.stringify(index_arr);

        fs.writeFileSync(this.PATH, index_arr__str, (err) => {
            if (err) {
                return console.log(err);
            }
            console.log("A Release was removed from index.json.");
        });

        return index_arr;
    }
}

function readReleaseFile(release) {
    return fs.readFileSync(`${RELEASES_DIR}/${release}`, 'utf8')
}
function readReleaseTile(releaseDate) {
    const releases_str = fs.readFileSync(ReleasesIndex.PATH, 'utf8');
    const releases_arr = JSON.parse(releases_str);
    const release = _find(releases_arr, release => release.date === releaseDate);

    console.log("release.title>> ", release.title);

    return release.title;
}

function sendEmail(emailObj, res) {
    // const transporter = nodemailer.createTransport({
    //     host: 'smtp.rambler.ru',
    //     port: 465,
    //     secure: true,  //true for 465 port, false for other ports
    //     auth: {
    //         user: 'obstedeka@rambler.ru',
    //         pass: ''
    //     }
    // });

    // console.log("emailObj>> ", emailObj);

    const transporter = nodemailer.createTransport({
        host: '127.0.0.1',
        port: 26,
        // secure: true,  //true for 465 port, false for other ports
        // auth: {
        //     user: '',
        //     pass: ''
        // }
    });

    const mdText = readReleaseFile(`${emailObj.releaseDate}.txt`);
    const mdHTML_str = markdownToHtmlString(mdText);

    const { JSDOM } = jsdom;
    const dom = new JSDOM(mdHTML_str);
    const mdHTML = dom.window.document.body.firstChild;

    const allImages = mdHTML.querySelectorAll("img");

    // console.log("allImages>> ", allImages);

    const toBase64Promise_arr = Array.prototype.map.call(allImages, img => image2base64(img.src));

    const all = Promise.all(toBase64Promise_arr)
        .then(
            (response) => {
                // console.log("toBase64Promise_arr>> ", response);

                allImages.forEach((img, i) => img.src = `data:image/png;base64,${response[i]}`);

                console.log("allImages>>", allImages);
                console.log("mdHTML>>", mdHTML.querySelector("img").src);
                
                let mailOptions = {
                    from: emailObj.sender, // sender address - "Persönlicher Name bzw. Unternehmensname" <>`
                    to: emailObj.recipient, // list of receivers
                    subject: readReleaseTile(emailObj.releaseDate), // Subject line
                    // text: 'Hello world?', // plain text body
                    html: sendEmail.getEmailHTML(mdHTML.outerHTML) // html body
                };
            
                var emailSending = new Promise(
                    function (resolve, reject) {
                        transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                console.log("<error> ", error);
                                reject(error);
                            } else {
                                console.log("<info> ", info);
                                resolve(info);
                            }
                        });
                    }
                )
                .then(function (emailResolveValue) {
                    res.send(emailResolveValue);
                })
                .catch(function (emailRejectValue) {
                    res.send(emailRejectValue);
                });

                // console.log("img.src>>: ", img.src);
            }
        )
        .catch(
            (error) => {
                console.log(error);
            }
        );

    function markdownToHtmlString(markdownText) {
        const converterMD = new showdown.Converter();
        const htmlString = converterMD.makeHtml(markdownText);
        const wrapperDivString = `<div class="sg-md__rendered">${htmlString}</div>`;

        return wrapperDivString;
    }


    // const emailHtml = `
    //         <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">
    //         <html>

    //         <head>
    //             <title>Email list</title>
    //         </head>

    //         <body>

    //             <table widt="600" border="0" cellpadding="0" cellspacing="0" bgcolor="#eeddcc" style="margin:0; padding:0">
    //                 <tr>
    //                     <td height="100%" style="padding: 10px;">
    //                         <center style="max-width: 600px; width: 100%;">
    //                             <!--[if gte mso 9]>
    //                                 <table border="0" cellpadding="0" cellspacing="0" style="margin:0; padding:0"><tr><td>
    //                                     ${mdHTML}
    //                             <![endif]-->
    //                                 <a href="#" style="color: #007bff; font: 16px Arial, Helvetica, sans-serif;; line-height: 30px; -webkit-text-size-adjust:none; display: block;"
    //                                 target="_blank">
    //                                     Ein Link
    //                                 </a>

    //                             <a href="tel:0­ 8­00 3­03 5­05" value="+380800303505" target="_blank" style="">0­ 8­00 3­03 5­05</a>
    //                             <a href="mailto:exemple@gmail.com" target="_blank" style="">exemple@gmail.com</a>

    //                             <span style="color: #333333; font: 10px Arial, sans-serif; line-height: 30px; -webkit-text-size-adjust:none; display: block;">
    //                                 Inline element
    //                             </span>
    //                             <span style="display:inline-block; width:260px;">
    //                                 Контент блока adaptive
    //                             </span>
    //                             <span style="display:inline-block; width:260px;">
    //                                 Контент блока adaptive
    //                             </span>
    //                             <span style="display:inline-block; width:260px;">
    //                                 Контент блока adaptive
    //                             </span>

    //                             <span style="display:inline-block; width:100%; padding: 10px; border: 1px dashed #aaaaaa;">
    //                                 {html}
    //                             </span>

    //                             <img src="http://www.pngmart.com/files/1/Volkswagen-PNG-File.png" alt="VW" border="0" width="250" height="120" style="display:block;" />
    //                             <!--[if gte mso 9]>
    //                                 </td></tr></table>
    //                             <![endif]-->
    //                         </center>
    //                     </td>
    //                 </tr>
    //             </table>

    //         </body>

    //         </html>
    //     `;


};

sendEmail.getEmailHTML = (html_str) => {
    return `
            <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">
            <html>
            <head>
                <title>Release Email</title>
            </head>
            <body>
                <table width="600" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="margin:0; padding:0">
                    <tr>
                        <td height="100%" style="padding: 10px;">
                            <center style="max-width: 600px; width: 100%;">
                            </center>
                                <!--[if gte mso 9]>
                                    <table border="0" cellpadding="0" cellspacing="0" style="margin:0; padding:0;">
                                        <tr>
                                            <td>
                                <![endif]-->
                                                ${html_str}
                                <!--[if gte mso 9]>
                                            </td>
                                        </tr>
                                    </table>
                                <![endif]-->
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
}

app.listen(port, () => {
    console.log(`Server is up on port ${port}`);
});