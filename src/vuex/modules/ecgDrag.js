
import Util from '../../common/util';
const state = {
    heartRates:[]
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    changeHeartRates(state,data){
        state.heartRates=data;
    },
    resetEcgDragModule(state,data){
        Util.resetVuexState(state);
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
