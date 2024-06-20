const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun } = require('docx');

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
    const menu = Menu.buildFromTemplate([
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
                    label: 'Export as Word',
                    click() {
                        exportTasksAsWord();
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
    ]);
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

// Export functions
function exportTasksAsPDF() {
    const filePath = dialog.showSaveDialogSync({
        title: 'Save Tasks as PDF',
        defaultPath: 'tasks.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!filePath) return;

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(16).text('Tasks', { align: 'center' });

    tasks.forEach((task, index) => {
        doc.fontSize(12).text(`${index + 1}. ${task}`, { align: 'left' });
    });

    doc.end();
}

function exportTasksAsWord() {
    const filePath = dialog.showSaveDialogSync({
        title: 'Save Tasks as Word',
        defaultPath: 'tasks.docx',
        filters: [{ name: 'Word Files', extensions: ['docx'] }]
    });

    if (!filePath) return;

    const doc = new Document();
    const paragraphs = tasks.map((task, index) => new Paragraph(`${index + 1}. ${task}`));

    doc.addSection({
        children: [new Paragraph({ text: 'Tasks', heading: 'Heading1' }), ...paragraphs]
    });

    Packer.toBuffer(doc).then((buffer) => {
        fs.writeFileSync(filePath, buffer);
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
