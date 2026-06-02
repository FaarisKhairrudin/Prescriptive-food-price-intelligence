import torch
from neuralforecast.losses.pytorch import MAE

with torch.serialization.safe_globals([MAE]):
    ckpt = torch.load('backend/narapangan_saved_model/nbeatsx_best_model/NBEATSx_0.ckpt', weights_only=False)

print("Hyper parameters:")
for k, v in ckpt.get("hyper_parameters", {}).items():
    print(f"{k}: {v}")
