const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');

    // Function to render tasks
    function renderTasks(tasks) {
        taskList.innerHTML = ''; // Clear the current list
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.textContent = task;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', () => {
                ipcRenderer.send('delete-task', index);
            });

            li.appendChild(deleteBtn);
            taskList.appendChild(li);
        });
    }

    // Load tasks on startup
    ipcRenderer.send('load-tasks');
    ipcRenderer.on('tasks', (event, tasks) => {
        renderTasks(tasks);
    });

    // Add task
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const taskText = taskInput.value.trim();
        if (taskText === '') return;

        ipcRenderer.send('add-task', taskText);
        taskInput.value = '';
    });
});
