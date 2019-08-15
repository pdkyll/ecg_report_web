<template>
    <div class="scatterHeader" style="overflow: hidden; display: flex;justify-content: space-between" v-if="!showEmpty">
        <LateralDateSelector :dates="validDates"
                             :datesIsContainData="datesIsContainData"
                             @change="dateItemClick"
        />
    </div>
</template>
<script>
    import {mapState, mapMutations, mapActions} from 'vuex';
    import LateralDateSelector from '../../components/common/LateralDateSelector.vue';
    import Util from '../../common/util';
    import {bus} from '../../bus';

    export default {
        name: 'CommonHeader',
        components: {
            LateralDateSelector,
        },
        computed: {
            ...mapState('ecgView', {
                validDates: state => state.validDates,
                datesIsContainData: state => state.datesIsContainData,
                selectComponent: state => state.selectComponent,
                currentDate: state => state.currentDate,
                tagChangeState: state => state.tagChangeState,
                showEmpty: state => state.showEmpty,
            }),
        },
        watch: {
            datesIsContainData() {
                let firstValidIndex = Util.firstExistDataIndex(this.datesIsContainData);
                if (firstValidIndex === -1) {
                    this.changeShowEmpty(true);
                }
            }
        },
        methods: {
            ...mapActions('ecgView', [
                'changeVSTagData'
            ]),
            ...mapMutations('ecgView', [
                'changeCurrentDateTags',
                'changePerDayData',
                'changeCurrentDate',
                'changeTagState',
                'changeShowEmpty',
                'changeSelectType',
                'changeDateIndex'
            ]),
            dateItemClick(index) {
                this.upDateChangeState();
                this.changeCurrentDate(this.validDates[index] + ' ' + '00:00:00');
                this.changeDateIndex(index);
                bus.$emit('crossPageChangeDateIndex')
            },
            /**
             * 修改更新状态
             */
            upDateChangeState() {
                let freshStateArray = new Array(this.tagChangeState.length).fill(true);
                this.changeTagState(freshStateArray);
            },
        }
    }
</script>