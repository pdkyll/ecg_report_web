import {mapState, mapMutations, mapActions} from 'vuex';
import API from "../../../src/api/api_user";
import Util from '../../../src/common/util';

export default {
    data: function () {
        return {
            page: 1,
            total: 1,
            limit: 10
        }
    },
    methods: {}
}
