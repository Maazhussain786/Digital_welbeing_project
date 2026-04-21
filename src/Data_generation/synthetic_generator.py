"""Synthetic data generation entrypoints."""

from pathlib import Path

from src.Data_generation.generate_data import DigitalWellbeingDataGenerator


def generate_synthetic_dataset(
    output_csv: str = "data/processed/synthetic_data.csv",
    num_users: int = 100,
    days: int = 30,
):
    """Generate synthetic behavior data and save it to CSV."""
    generator = DigitalWellbeingDataGenerator(num_users=num_users, days=days)
    df = generator.generate_full_dataset()

    output_path = Path(output_csv)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    return df


if __name__ == "__main__":
    generated = generate_synthetic_dataset()
    print(f"Generated {len(generated):,} rows")
