from datetime import datetime, timedelta, timezone

def calculate_sm2(quality: int, repetition: int, interval: int, ease_factor: float):
    # Ensure quality bounds [0, 5]
    q = max(0, min(5, quality))
    
    # Calculate new ease factor
    new_ef = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    new_ef = max(1.3, new_ef)
    
    if q < 3:
        new_repetition = 0
        new_interval = 1
    else:
        if repetition == 0:
            new_interval = 1
        elif repetition == 1:
            new_interval = 6
        else:
            new_interval = round(interval * new_ef)
        new_repetition = repetition + 1

    next_review = datetime.now(timezone.utc) + timedelta(days=new_interval)
    return new_repetition, new_interval, new_ef, next_review