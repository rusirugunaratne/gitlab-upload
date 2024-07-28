const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const newFileName = `${uniqueSuffix}-${file.originalname}`;
        cb(null, newFileName);
    }
});

const upload = multer({ storage: storage });

const gitlabToken = process.env.GITLAB_TOKEN;
const gitlabRepoId = process.env.GITLAB_REPO_ID;
const gitlabBranch = process.env.GITLAB_BRANCH;

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).send('No file uploaded.');
        }

        const fileContent = fs.readFileSync(file.path, 'utf8');

        const data = {
            branch: gitlabBranch,
            commit_message: 'Upload CSV file',
            actions: [
                {
                    action: 'create',
                    file_path: `samples/${file.filename}`,
                    content: fileContent
                }
            ]
        };

        const response = await axios.post(
            `https://gitlab.com/api/v4/projects/${gitlabRepoId}/repository/commits`,
            data,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Private-Token': gitlabToken
                }
            }
        );

        fs.unlinkSync(file.path);

        res.status(200).send('File uploaded successfully to GitLab.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error uploading file to GitLab.');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
