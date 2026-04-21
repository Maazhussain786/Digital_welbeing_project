import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random

class DigitalWellbeingDataGenerator:
    """
    Generate synthetic user behavior data for training RL models
    """
    
    def __init__(self, num_users=100, days=30):
        self.num_users = num_users
        self.days = days
        
        # Define app categories and typical time-wasting apps
        self.apps = {
            'social_media': ['Instagram', 'Facebook', 'Twitter', 'TikTok', 'Snapchat'],
            'entertainment': ['YouTube', 'Netflix', 'Twitch', 'Reddit', 'Gaming'],
            'productivity': ['Gmail', 'Docs', 'GitHub', 'Stackoverflow', 'LinkedIn'],
            'shopping': ['Amazon', 'Flipkart', 'eBay'],
            'news': ['BBC', 'CNN', 'Medium']
        }
        
        # User personas with different behavior patterns
        self.user_personas = [
            'heavy_procrastinator',  # High social media, low productivity
            'balanced_user',         # Moderate usage
            'workaholic',            # High productivity, low entertainment
            'binge_watcher',         # High entertainment
            'social_butterfly'       # High social media
        ]
        
    def generate_user_profile(self, persona):
        """Generate a user profile based on persona"""
        if persona == 'heavy_procrastinator':
            return {
                'social_media_tendency': np.random.uniform(0.7, 0.9),
                'entertainment_tendency': np.random.uniform(0.6, 0.8),
                'productivity_tendency': np.random.uniform(0.1, 0.3),
                'avg_session_length': np.random.uniform(20, 45),  # minutes
                'daily_opens': np.random.randint(50, 100)
            }
        elif persona == 'balanced_user':
            return {
                'social_media_tendency': np.random.uniform(0.3, 0.5),
                'entertainment_tendency': np.random.uniform(0.3, 0.5),
                'productivity_tendency': np.random.uniform(0.4, 0.6),
                'avg_session_length': np.random.uniform(10, 20),
                'daily_opens': np.random.randint(30, 50)
            }
        elif persona == 'workaholic':
            return {
                'social_media_tendency': np.random.uniform(0.1, 0.2),
                'entertainment_tendency': np.random.uniform(0.1, 0.3),
                'productivity_tendency': np.random.uniform(0.7, 0.9),
                'avg_session_length': np.random.uniform(30, 60),
                'daily_opens': np.random.randint(20, 40)
            }
        elif persona == 'binge_watcher':
            return {
                'social_media_tendency': np.random.uniform(0.2, 0.4),
                'entertainment_tendency': np.random.uniform(0.7, 0.9),
                'productivity_tendency': np.random.uniform(0.2, 0.4),
                'avg_session_length': np.random.uniform(30, 90),
                'daily_opens': np.random.randint(15, 30)
            }
        else:  # social_butterfly
            return {
                'social_media_tendency': np.random.uniform(0.8, 0.95),
                'entertainment_tendency': np.random.uniform(0.3, 0.5),
                'productivity_tendency': np.random.uniform(0.2, 0.4),
                'avg_session_length': np.random.uniform(15, 30),
                'daily_opens': np.random.randint(60, 120)
            }
    
    def generate_hourly_pattern(self, hour, day_of_week):
        """Generate usage probability based on hour and day"""
        # Weekday pattern
        if day_of_week < 5:  # Monday to Friday
            if 9 <= hour <= 17:  # Work hours
                return 0.3 + np.random.uniform(-0.1, 0.1)
            elif 19 <= hour <= 23:  # Evening
                return 0.8 + np.random.uniform(-0.1, 0.1)
            elif 0 <= hour <= 2:  # Late night
                return 0.5 + np.random.uniform(-0.1, 0.1)
            else:
                return 0.2 + np.random.uniform(-0.05, 0.05)
        else:  # Weekend
            if 10 <= hour <= 14:
                return 0.7 + np.random.uniform(-0.1, 0.1)
            elif 19 <= hour <= 23:
                return 0.9 + np.random.uniform(-0.05, 0.05)
            else:
                return 0.4 + np.random.uniform(-0.1, 0.1)
    
    def generate_session(self, user_profile, timestamp):
        """Generate a single session"""
        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        
        # Decide if user is active at this hour
        activity_prob = self.generate_hourly_pattern(hour, day_of_week)
        
        if np.random.random() > activity_prob:
            return None
        
        # Choose app category based on user profile
        category_probs = [
            user_profile['social_media_tendency'],
            user_profile['entertainment_tendency'],
            user_profile['productivity_tendency'],
            0.1,  # shopping
            0.1   # news
        ]
        category_probs = np.array(category_probs) / sum(category_probs)
        
        category = np.random.choice(list(self.apps.keys()), p=category_probs)
        app = np.random.choice(self.apps[category])
        
        # Generate session duration (in minutes)
        base_duration = user_profile['avg_session_length']
        duration = max(1, np.random.exponential(base_duration))
        
        # Is this a time-wasting session?
        is_time_wasting = category in ['social_media', 'entertainment'] and duration > 15
        
        return {
            'timestamp': timestamp,
            'hour': hour,
            'day_of_week': day_of_week,
            'app': app,
            'category': category,
            'duration_minutes': round(duration, 2),
            'is_time_wasting': is_time_wasting
        }
    
    def generate_user_data(self, user_id):
        """Generate complete data for one user"""
        # Assign random persona
        persona = np.random.choice(self.user_personas)
        user_profile = self.generate_user_profile(persona)
        
        sessions = []
        start_date = datetime.now() - timedelta(days=self.days)
        
        for day in range(self.days):
            current_date = start_date + timedelta(days=day)
            daily_opens = int(np.random.poisson(user_profile['daily_opens'] / 24))  # per hour avg
            
            for hour in range(24):
                # Generate multiple sessions per hour
                for _ in range(np.random.poisson(daily_opens)):
                    timestamp = current_date.replace(
                        hour=hour,
                        minute=np.random.randint(0, 60),
                        second=np.random.randint(0, 60)
                    )
                    
                    session = self.generate_session(user_profile, timestamp)
                    if session:
                        session['user_id'] = user_id
                        session['persona'] = persona
                        sessions.append(session)
        
        return pd.DataFrame(sessions)
    
    def generate_full_dataset(self):
        """Generate dataset for all users"""
        all_data = []
        
        print(f"Generating data for {self.num_users} users over {self.days} days...")
        
        for user_id in range(self.num_users):
            if user_id % 10 == 0:
                print(f"Processing user {user_id}/{self.num_users}...")
            
            user_data = self.generate_user_data(user_id)
            all_data.append(user_data)
        
        full_df = pd.concat(all_data, ignore_index=True)
        
        # Add derived features for RL
        full_df = self.add_rl_features(full_df)
        
        print(f"✓ Generated {len(full_df)} sessions")
        return full_df
    
    def add_rl_features(self, df):
        """Add features needed for RL model"""
        # Cumulative time today
        df = df.sort_values(['user_id', 'timestamp'])
        df['date'] = df['timestamp'].dt.date
        df['cumulative_time_today'] = df.groupby(['user_id', 'date'])['duration_minutes'].cumsum()
        
        # Sessions today so far
        df['session_count_today'] = df.groupby(['user_id', 'date']).cumcount() + 1
        
        # Time since last session (in minutes)
        df['time_since_last_session'] = df.groupby('user_id')['timestamp'].diff().dt.total_seconds() / 60
        df['time_since_last_session'] = df['time_since_last_session'].fillna(120)  # Default 2 hours
        
        # Is weekend
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Time of day category
        df['time_category'] = pd.cut(
            df['hour'],
            bins=[0, 6, 12, 17, 21, 24],
            labels=['night', 'morning', 'afternoon', 'evening', 'late_night'],
            include_lowest=True
        )
        
        return df
    
    def save_dataset(self, filename='digital_wellbeing_data.csv'):
        """Generate and save dataset"""
        df = self.generate_full_dataset()
        df.to_csv(filename, index=False)
        print(f"\n✓ Dataset saved to {filename}")
        
        # Print statistics
        print("\n" + "="*60)
        print("DATASET STATISTICS")
        print("="*60)
        print(f"Total sessions: {len(df):,}")
        print(f"Total users: {df['user_id'].nunique()}")
        print(f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
        print(f"Time-wasting sessions: {df['is_time_wasting'].sum():,} ({df['is_time_wasting'].mean()*100:.1f}%)")
        print(f"Average session duration: {df['duration_minutes'].mean():.2f} minutes")
        print(f"Total screen time: {df['duration_minutes'].sum()/60:.1f} hours")
        
        print(f"\n{'Top 10 Apps by Usage Time':^60}")
        print("-"*60)
        top_apps = df.groupby('app')['duration_minutes'].sum().sort_values(ascending=False).head(10)
        for app, minutes in top_apps.items():
            print(f"{app:<30} {minutes/60:>10.1f} hours")
        
        print(f"\n{'User Personas Distribution':^60}")
        print("-"*60)
        persona_dist = df.groupby('persona')['user_id'].nunique()
        for persona, count in persona_dist.items():
            print(f"{persona:<30} {count:>10} users")
        
        print(f"\n{'Category Breakdown':^60}")
        print("-"*60)
        category_time = df.groupby('category')['duration_minutes'].sum().sort_values(ascending=False)
        for category, minutes in category_time.items():
            hours = minutes / 60
            percentage = (minutes / df['duration_minutes'].sum()) * 100
            print(f"{category:<30} {hours:>10.1f} hrs ({percentage:>5.1f}%)")
        
        print("="*60)
        
        return df


# Example usage
if __name__ == "__main__":
    print("="*60)
    print("DIGITAL WELLBEING SYNTHETIC DATA GENERATOR")
    print("="*60)
    print()
    
    # Generate dataset
    generator = DigitalWellbeingDataGenerator(num_users=100, days=30)
    df = generator.save_dataset('digital_wellbeing_training_data.csv')
    
    # Show sample
    print("\n" + "="*60)
    print("SAMPLE DATA (First 10 Sessions)")
    print("="*60)
    print(df[['user_id', 'timestamp', 'app', 'category', 'duration_minutes', 
              'is_time_wasting', 'cumulative_time_today']].head(10).to_string(index=False))
    
    print("\n" + "="*60)
    print("DATA READY FOR RL TRAINING!")
    print("="*60)
    print(f"File: digital_wellbeing_training_data.csv")
    print(f"Rows: {len(df):,}")
    print(f"Columns: {len(df.columns)}")
    print("\nNext steps:")
    print("1. Load this data into your PyTorch RL model")
    print("2. Use 'cumulative_time_today', 'session_count_today', etc. as state features")
    print("3. Train Q-Learning or DQN model")
    print("="*60)