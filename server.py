from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import shutil

app = Flask(__name__)
CORS(app)

# Constants
STORAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'storage')

# Ensure storage directory exists
os.makedirs(STORAGE_DIR, exist_ok=True)

def normalize_path(path):
    """Normalize file path for consistent handling."""
    # Convert backslashes to forward slashes
    path = path.replace('\\', '/')
    # Remove any leading slashes
    path = path.lstrip('/')
    return path

def get_file_info(path):
    """Get information about a file or directory."""
    abs_path = os.path.join(STORAGE_DIR, path)
    rel_path = os.path.relpath(abs_path, STORAGE_DIR).replace('\\', '/')
    name = os.path.basename(path)
    
    if os.path.isdir(abs_path):
        children = []
        for child in sorted(os.listdir(abs_path)):
            child_path = os.path.join(path, child)
            children.append(get_file_info(child_path))
        return {
            'type': 'directory',
            'name': name,
            'path': rel_path,
            'children': children
        }
    else:
        return {
            'type': 'file',
            'name': name,
            'path': rel_path
        }

@app.route('/api/files', methods=['GET'])
def list_files():
    """List all files and directories in the storage directory."""
    try:
        files = []
        for item in sorted(os.listdir(STORAGE_DIR)):
            files.append(get_file_info(item))
        return jsonify(files)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<path:file_path>', methods=['GET'])
def get_file(file_path):
    """Get the contents of a file."""
    try:
        file_path = normalize_path(file_path)
        abs_path = os.path.join(STORAGE_DIR, file_path)
        
        if not os.path.exists(abs_path):
            return jsonify({'error': 'File not found'}), 404
        
        if not os.path.isfile(abs_path):
            return jsonify({'error': 'Path is not a file'}), 400
        
        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({'content': content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<path:file_path>', methods=['POST'])
def save_file(file_path):
    """Save or update a file."""
    try:
        data = request.get_json()
        if 'content' not in data:
            return jsonify({'error': 'No content provided'}), 400
        
        file_path = normalize_path(file_path)
        abs_path = os.path.join(STORAGE_DIR, file_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        
        with open(abs_path, 'w', encoding='utf-8') as f:
            f.write(data['content'])
        return jsonify({'message': 'File saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<path:file_path>', methods=['DELETE'])
def delete_item(file_path):
    """Delete a file or directory."""
    try:
        file_path = normalize_path(file_path)
        abs_path = os.path.join(STORAGE_DIR, file_path)
        
        if not os.path.exists(abs_path):
            return jsonify({'error': 'Path not found'}), 404
        
        if os.path.isdir(abs_path):
            shutil.rmtree(abs_path)
        else:
            os.remove(abs_path)
        
        return jsonify({'message': 'Item deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/folders', methods=['POST'])
def create_folder():
    """Create a new folder."""
    try:
        data = request.get_json()
        if 'path' not in data:
            return jsonify({'error': 'No path provided'}), 400
        
        folder_path = normalize_path(data['path'])
        abs_path = os.path.join(STORAGE_DIR, folder_path)
        
        if os.path.exists(abs_path):
            return jsonify({'error': 'Folder already exists'}), 400
        
        os.makedirs(abs_path)
        return jsonify({'message': 'Folder created successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=1234)
