#!/usr/bin/env python3
"""
Startup script for the Pipeline API Server
This script ensures the API server starts with proper configuration
"""

import os
import sys

# Add the current directory to Python path to ensure imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Set up environment
os.chdir(current_dir)

# Import and run the API server
if __name__ == "__main__":
    print("🚀 Starting Pipeline API Server...")
    print(f"📁 Working directory: {current_dir}")
    
    try:
        from api_server import app
        app.run(host="0.0.0.0", port=5000, debug=True)
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Please ensure all dependencies are installed:")
        print("pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)