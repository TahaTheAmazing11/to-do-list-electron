const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const PDFDocument = require('pdfkit');

let tasks = [];

// Function to save tasks to JSON file
function saveTasksToFile() {
    const filePath = path.join(app.getPath('userData'), 'tasks.json');
    fs.writeFileSync(filePath, JSON.stringify(tasks));
}

// Function to load tasks from JSON file
function loadTasksFromFile() {
    try {
        const filePath = path.join(app.getPath('userData'), 'tasks.json');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath);
            tasks = JSON.parse(data);
        } else {
            tasks = []; // Initialize tasks array if file doesn't exist
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasks = []; // Initialize tasks array on error
    }
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true // Allow using remote module (if needed)
        }
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Remove the dev tools opening
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('tasks', tasks);
    });

    // Create application menu
    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Export as PDF',
                    click() {
                        exportTasksAsPDF();
                    }
                },
                {
                    label: 'Export as TXT',
                    click() {
                        exportTasksAsTXT();
                    }
                },
                {
                    label: 'Quit',
                    click() {
                        app.quit();
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

app.on('ready', () => {
    loadTasksFromFile(); // Load tasks on app startup
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle adding and deleting tasks via IPC
ipcMain.on('add-task', (event, task) => {
    tasks.push(task);
    saveTasksToFile();
    event.sender.send('tasks', tasks); // Send updated tasks to renderer
});

ipcMain.on('delete-task', (event, index) => {
    tasks.splice(index, 1);
    saveTasksToFile();
    event.sender.send('tasks', tasks); // Send updated tasks to renderer
});

function exportTasksAsPDF() {
    const filePath = dialog.showSaveDialogSync({
        title: 'Save Tasks as PDF',
        defaultPath: 'tasks.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!filePath) return;

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Date in top right corner
    const now = new Date();
    const formattedDate = now.toLocaleString();
    const dateTextWidth = doc.widthOfString(formattedDate);
    doc.fontSize(10).fillColor('#333').text(formattedDate, { align: 'right', width: dateTextWidth });

    // Title
    doc.moveDown();
    doc.fontSize(24).fillColor('#007BFF').text('To-Do List', { align: 'center' });
    doc.moveDown();

    // Tasks
    tasks.forEach((task, index) => {
        const backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#eee';
        doc.fontSize(12).fillColor('#333').text(`${index + 1}. ${task}`, { align: 'left', backgroundColor });
        doc.moveDown();
    });

    doc.end();
    stream.on('finish', () => {
        console.log(`PDF created: ${filePath}`);
    });
}

function exportTasksAsTXT() {
    const filePath = dialog.showSaveDialogSync({
        title: 'Save Tasks as TXT',
        defaultPath: 'tasks.txt',
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });

    if (!filePath) return;

    const content = tasks.map((task, index) => `${index + 1}. ${task}`).join('\n');
    fs.writeFileSync(filePath, content);
}
