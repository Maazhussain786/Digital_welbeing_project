import pandas as pd

from src.Data_generation.synthetic_generator import generate_synthetic_dataset


def test_generate_synthetic_dataset_has_rows(tmp_path):
    out = tmp_path / "synthetic.csv"
    df = generate_synthetic_dataset(output_csv=str(out), num_users=2, days=1)
    assert isinstance(df, pd.DataFrame)
    assert len(df) > 0
    assert out.exists()
