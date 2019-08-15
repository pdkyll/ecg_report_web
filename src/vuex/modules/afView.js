// initial state
// shape: [{ id, quantity }]
import Util from '../../common/util';

const state = {
    tagsLoading: false,
    showDiffChart: false,
    afFragmentData: [],
    selectedTime: 0, // time unit: second
    selectedPosition: 0,
    selectedRange: null,  // null or { from, to }
    TALMultipleSelection:[]//临时房颤列表复选框勾选项
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    changeTagsLoading(state, data) {
        state.tagsLoading = data;
    },
    changeShowDiffChart(state, data) {
        state.showDiffChart = data;
    },
    changeAfFragmentData(state, data) {
        state.afFragmentData = data.map((v) => {
            return {
                time: Util.formatTimeH(v[0]),
                timeLen: Util.calcTimeLength(v[0], v[1]),
                type: 'AF',
                isSavedState:false
            }
        });
    },
    changeAfFragmentData2(state,data){
        state.afFragmentData=data;
    },
    changeSelectedTime(state, seconds) {
        state.selectedTime = seconds;
    },
    changeSelectedPosition(state, position) {
        state.selectedPosition = position;
    },
    changeSelectedRange(state, range) {
        state.selectedRange = range == null ? null : {from: Math.floor(range.from), to: Math.floor(range.to)};
    },
    changeTALMultipleSelection(state,data){
      state.TALMultipleSelection=data;
    },
    resetAfViewModule(state,data){
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
