const editor = document.getElementById('markdown-input');
const preview = document.getElementById('preview');
const currentFileDisplay = document.getElementById('current-file');
const fileList = document.querySelector('.file-list');
const API_URL = 'http://localhost:5000/api';

let currentFileName = null;

// Load saved content from localStorage as default
editor.value = localStorage.getItem('markdown-content') || '# Welcome to the Markdown Editor\n\nStart typing in markdown format and see the live preview on the right.\n\n## Features\n\n- Live preview\n- Server-side file storage\n- Clean interface\n- VSCode-like dark theme\n- Markdown toolbar\n\n```js\nconsole.log("Hello, World!");\n```';

function updateCurrentFileName(filename) {
    currentFileName = filename;
    // Remove .md extension for display
    const displayName = filename ? filename.replace(/\.md$/, '') : 'Untitled';
    currentFileDisplay.textContent = displayName;
}

function createFileListItem(item, level = 0) {
    const div = document.createElement('div');
    
    if (item.type === 'directory') {
        div.className = 'folder-item';
        const folderContent = document.createElement('div');
        folderContent.className = 'folder-content';
        
        const folderHeader = document.createElement('div');
        folderHeader.className = 'file-item';
        folderHeader.innerHTML = `
            <span class="file-name">
                <i class="fas fa-folder"></i>${item.name}
            </span>
            <div class="file-actions">
                <button class="file-action" onclick="event.stopPropagation(); createNewFile('${item.path}')">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="file-action" onclick="event.stopPropagation(); createNewFolder('${item.path}')">
                    <i class="fas fa-folder-plus"></i>
                </button>
                <button class="file-action" onclick="event.stopPropagation(); deleteFolder('${item.path}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        div.appendChild(folderHeader);
        
        // Create and append children elements directly instead of using innerHTML
        item.children.forEach(child => {
            const childElement = createFileListItem(child, level + 1);
            folderContent.appendChild(childElement);
        });
        
        div.appendChild(folderContent);
    } else {
        // For files
        const displayName = item.name.replace(/\.md$/, '');
        div.className = 'file-item';
        if (currentFileName === item.path) {
            div.classList.add('active');
        }
        
        // Create elements manually instead of using innerHTML
        const fileNameSpan = document.createElement('span');
        fileNameSpan.className = 'file-name';
        fileNameSpan.innerHTML = `<i class="fas fa-file-alt"></i>${displayName}`;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'file-actions';
        const deleteButton = document.createElement('button');
        deleteButton.className = 'file-action';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deleteFile(item.path);
        };
        actionsDiv.appendChild(deleteButton);
        
        div.appendChild(fileNameSpan);
        div.appendChild(actionsDiv);
        
        // Add the click handler to the entire div
        div.onclick = (e) => {
            if (!e.target.closest('.file-actions')) {
                loadFile(item.path);
            }
        };
    }
    
    return div;
}

async function loadFiles() {
    try {
        const response = await fetch(`${API_URL}/files`);
        const files = await response.json();
        fileList.innerHTML = '';
        
        // Add "New File" and "New Folder" buttons at the top
        const actionButtons = document.createElement('div');
        actionButtons.className = 'file-item';
        actionButtons.innerHTML = `
            <div class="file-actions" style="display: flex; width: 100%; justify-content: flex-end; padding: 8px;">
                <button class="file-action" onclick="createNewFile('')" title="New File">
                    <i class="fas fa-file-plus"></i>
                </button>
                <button class="file-action" onclick="createNewFolder('')" title="New Folder">
                    <i class="fas fa-folder-plus"></i>
                </button>
            </div>
        `;
        fileList.appendChild(actionButtons);
        
        // Add files and folders
        files.forEach(item => {
            fileList.appendChild(createFileListItem(item));
        });
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

async function loadFile(path) {
    if (!path) {
        console.error('No path provided to loadFile');
        return;
    }
    
    console.log('Loading file:', path); // Debug log
    
    try {
        const response = await fetch(`${API_URL}/files/${encodeURIComponent(path)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('File data:', data); // Debug log
        
        if (data.content !== undefined) {
            editor.value = data.content;
            updateCurrentFileName(path);
            updatePreview();
            
            // Update active state
            document.querySelectorAll('.file-item').forEach(item => {
                const itemPath = item.getAttribute('data-path');
                if (itemPath === path) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        } else {
            console.error('No content in response:', data);
        }
    } catch (error) {
        console.error('Error loading file:', error);
    }
}

async function createNewFile(folderPath) {
    let filename = prompt('Enter file name:');
    if (!filename) return;
    
    // Remove .md extension if user added it
    filename = filename.replace(/\.md$/, '');
    
    // Add .md extension for storage
    const fullPath = folderPath 
        ? `${folderPath}/${filename}.md` 
        : `${filename}.md`;
    
    try {
        await saveFile(fullPath);
        loadFiles();
    } catch (error) {
        console.error('Error creating file:', error);
    }
}

async function createNewFolder(parentPath) {
    const folderName = prompt('Enter folder name:', 'New Folder');
    if (!folderName) return;
    
    const path = parentPath ? `${parentPath}/${folderName}` : folderName;
    try {
        const response = await fetch(`${API_URL}/folders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path }),
        });
        
        if (response.ok) {
            loadFiles();
        }
    } catch (error) {
        console.error('Error creating folder:', error);
    }
}

async function saveFile(path = null) {
    const filename = path || currentFileName || prompt('Enter file name:', 'untitled.md');
    if (!filename) return;
    
    try {
        const response = await fetch(`${API_URL}/files/${encodeURIComponent(filename)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: editor.value }),
        });
        
        if (response.ok) {
            updateCurrentFileName(filename);
            loadFiles();
        } else {
            const data = await response.json();
            console.error('Error saving file:', data.error);
        }
    } catch (error) {
        console.error('Error saving file:', error);
    }
}

async function deleteFile(path) {
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/files/${encodeURIComponent(path)}`, {
            method: 'DELETE',
        });
        
        if (response.ok) {
            if (currentFileName === path) {
                editor.value = '';
                updateCurrentFileName(null);
                updatePreview();
            }
            loadFiles();
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
}

async function deleteFolder(path) {
    if (!confirm(`Are you sure you want to delete the folder ${path}?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/files/${encodeURIComponent(path)}`, {
            method: 'DELETE',
        });
        
        if (response.ok) {
            loadFiles();
        }
    } catch (error) {
        console.error('Error deleting folder:', error);
    }
}

function updatePreview() {
    const markdownText = editor.value;
    const htmlContent = marked.parse(markdownText);
    preview.innerHTML = htmlContent;
    localStorage.setItem('markdown-content', markdownText);
}

// Helper function to wrap selected text with markdown syntax
function wrapText(before, after) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    const replacement = before + selectedText + after;
    editor.value = editor.value.substring(0, start) + replacement + editor.value.substring(end);
    updatePreview();
    editor.focus();
    editor.setSelectionRange(start + before.length, end + before.length);
}

// Toolbar button handlers
document.getElementById('bold-btn').addEventListener('click', () => wrapText('**', '**'));
document.getElementById('italic-btn').addEventListener('click', () => wrapText('*', '*'));
document.getElementById('link-btn').addEventListener('click', () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) wrapText('[', `](${url})`);
});
document.getElementById('code-btn').addEventListener('click', () => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    if (selectedText.includes('\n')) {
        wrapText('```\n', '\n```');
    } else {
        wrapText('`', '`');
    }
});
document.getElementById('list-btn').addEventListener('click', () => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    const lines = selectedText.split('\n');
    const bulletList = lines.map(line => `- ${line}`).join('\n');
    editor.value = editor.value.substring(0, start) + bulletList + editor.value.substring(end);
    updatePreview();
});

document.getElementById('save-btn').addEventListener('click', () => saveFile());

// Sidebar functionality
const sidebarIcons = document.querySelectorAll('.sidebar-icon');
sidebarIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        if (icon.title === 'Files') {
            // Toggle file list visibility
            const isVisible = icon.classList.contains('active');
            
            // Update icon state
            sidebarIcons.forEach(i => {
                if (i !== icon) i.classList.remove('active');
            });
            icon.classList.toggle('active');
            
            // Update file list visibility
            fileList.style.display = !isVisible ? 'block' : 'none';
            
            // Update main container margin
            document.querySelector('.main-container').style.marginLeft = !isVisible ? '250px' : '0';
            
            // Load files if showing file list
            if (!isVisible) {
                loadFiles();
            }
        } else if (icon.title === 'Editor') {
            // Remove active class from other icons
            sidebarIcons.forEach(i => {
                if (i !== icon) i.classList.remove('active');
            });
            // Add active class to editor icon
            icon.classList.add('active');
            
            // Hide file list and reset margin
            fileList.style.display = 'none';
            document.querySelector('.main-container').style.marginLeft = '0';
        } else {
            // Handle other icons (e.g., Settings)
            sidebarIcons.forEach(i => {
                if (i !== icon) i.classList.remove('active');
            });
            icon.classList.toggle('active');
        }
    });
});

// Resizer functionality
const resizer = document.getElementById('resizer');
const editorContainer = document.querySelector('.editor');
let isResizing = false;
let startX;
let startWidth;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizer.classList.add('active');
    
    startX = e.pageX;
    startWidth = editorContainer.offsetWidth;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', () => {
        isResizing = false;
        resizer.classList.remove('active');
        document.removeEventListener('mousemove', handleMouseMove);
    });
});

function handleMouseMove(e) {
    if (!isResizing) return;
    
    const width = startWidth + (e.pageX - startX);
    const containerWidth = editorContainer.parentElement.offsetWidth;
    
    // Ensure editor width stays within reasonable bounds (20% - 80% of container)
    const minWidth = containerWidth * 0.2;
    const maxWidth = containerWidth * 0.8;
    
    if (width >= minWidth && width <= maxWidth) {
        editorContainer.style.flex = '0 0 auto';
        editorContainer.style.width = `${width}px`;
    }
}

// Initial render
editor.addEventListener('input', updatePreview);
updatePreview();
loadFiles();
