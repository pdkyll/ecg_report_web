// initial state
// shape: [{ id, quantity }]
import Util from '../../common/util';

const state = {
    currentDate: '',
    add: 10,
    registedComponent: []
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    /**
     * 修改注册组件
     * @param state
     * @param param
     */
    changeRegistedComponent(state, param) {
        state.registedComponent = param;
    },
    /**
     * 修改当前日期
     * @param state
     * @param param
     */
    changeCurrentDate(state, param) {
        state.currentDate = param;
    },
    /**
     * 修改增益
     * @param state
     * @param param
     */
    changeAdd(state, param) {
        state.add = param;
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
