from sentence_transformers import SentenceTransformer
import torch

print("Starting download/load...")
model = SentenceTransformer('Qwen/Qwen3-Embedding-4B', model_kwargs={"torch_dtype": torch.float16}, device='cpu')
print("Model loaded successfully!")
