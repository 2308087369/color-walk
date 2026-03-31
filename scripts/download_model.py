import os
import argparse
from modelscope.hub.snapshot_download import snapshot_download

def download_model(model_id):
    # Base directory for models
    base_dir = "/gcl/my_project/color-city/models_llm"
    
    # Construct the local directory path
    # Example: model_id = "Qwen/Qwen2.5-7B-Instruct" -> local_dir = ".../models/Qwen/Qwen2.5-7B-Instruct"
    # We preserve the organization/model structure to avoid conflicts
    local_dir = os.path.join(base_dir, model_id)
    
    print(f"Preparing to download: {model_id}")
    print(f"Target directory: {local_dir}")
    
    # Create directory if it doesn't exist
    if not os.path.exists(local_dir):
        os.makedirs(local_dir)
    
    try:
        # download the model
        # cache_dir is used for caching, but here we want to download to a specific location
        # usually snapshot_download returns the path. 
        # For ModelScope, if we want to download to a specific local directory without symlinks/cache structure,
        # we can check if there's a specific parameter. 
        # By default snapshot_download uses a cache mechanism. 
        # However, we can use the cache_dir to point to our models folder, 
        # but that creates a specific structure.
        # A common way to "export" or download to a specific dir is just using it as cache_dir,
        # or copying it out. 
        # But wait, looking at ModelScope docs, they often just use cache_dir.
        # Let's try to find if there is a way to just download files to a folder directly.
        # Newer versions support `local_dir` which ignores cache structure if set.
        
        # We will try to use local_dir if supported, otherwise fallback or just rely on the return value.
        # Based on pip show, version is 1.33.0, which should support local_dir behavior via specific arguments or just cache_dir.
        # Let's stick to the most robust way: 
        # passing cache_dir puts it in <cache_dir>/<model_id> usually.
        # Let's just use the root models dir as cache_dir, so it will become /gcl/.../models/Qwen/Qwen...
        
        path = snapshot_download(model_id, cache_dir=base_dir)
        
        print(f"\n✅ Download completed successfully!")
        print(f"Model stored at: {path}")
        
    except Exception as e:
        print(f"\n❌ Error downloading model: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download models from ModelScope to workspace")
    parser.add_argument("model_id", type=str, help="The model ID on ModelScope (e.g., Qwen/Qwen2.5-7B-Instruct)")
    
    args = parser.parse_args()
    
    download_model(args.model_id)
