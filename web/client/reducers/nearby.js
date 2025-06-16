import { INCREMENT_COUNTER, TOGGLE_NEARBY } from '../actions/nearby';


export const nearbyReducer = (state = {counter : 0}, action) => {
    switch(action.type){
        case INCREMENT_COUNTER:
            return {
                counter: state.counter + (action.amount || 1),
                lastIncrementType: action.incrementType
            }
        case TOGGLE_NEARBY:
           return {
                ...state,
                showNearby: !state.showNearby
            };
        default:
            return state;
    }
}