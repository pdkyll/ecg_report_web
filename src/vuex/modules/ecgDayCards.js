// initial state
// shape: [{ id, quantity }]
import Util from '../../common/util';
const state = {
    dates:[]//日期卡片异常统计信息
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    changeDates(state,data){
        state.dates=data;
    },
    resetEcgDayCardModule(state,data){
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
