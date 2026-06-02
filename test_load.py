import torch
import pandas as pd
import numpy as np
from neuralforecast import NeuralForecast
from neuralforecast.losses.pytorch import MAE

with torch.serialization.safe_globals([MAE]):
    nf = NeuralForecast.load('backend/narapangan_saved_model/nbeatsx_best_model')

df = pd.DataFrame({
    'ds': pd.date_range('2026-06-02', periods=10, freq='W'), 
    'y': np.random.rand(10), 
    'unique_id': ['Cabai Merah']*10,
    'is_idul_fitri': [0]*10,
    'is_ramadan': [0]*10,
    'Garut_RH2M_lag13w': [0]*10,
    'is_idul_adha': [0]*10,
    'Garut_T2M_lag8w': [0]*10
})
futr_df = pd.DataFrame({
    'ds': pd.date_range('2026-08-11', periods=4, freq='W'), 
    'unique_id': ['Cabai Merah']*4,
    'is_idul_fitri': [0]*4,
    'is_ramadan': [0]*4,
    'Garut_RH2M_lag13w': [0]*4,
    'is_idul_adha': [0]*4,
    'Garut_T2M_lag8w': [0]*4
})
print(nf.predict(df=df, futr_df=futr_df))
