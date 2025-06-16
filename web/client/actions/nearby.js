export const INCREMENT_COUNTER = 'NEARBY:INCREMENT_COUNTER';
export const TOGGLE_NEARBY = 'NEARBY:TOGGLE_NEARBY';

export const incrementCounter = (amount = 1, incrementType = "default") => ({
    type: INCREMENT_COUNTER,
    amount,
    incrementType
});

export const toggleNearby = () => ({
    type: TOGGLE_NEARBY
});