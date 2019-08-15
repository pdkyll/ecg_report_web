import {mapState, mapMutations, mapActions} from 'vuex';

export default {
    data: function() {
        return {
            chart: null,
            clickedLine: null, // { hour, position }
            xAxisDraggingInfo: null, // null or { hour, left, width }
            yAxisDraggingInfo: null // null or { top, screenY }
        };
    },
    computed: {
        ...mapState('ecgView', {
            ecgStartTime: state => state.ecgStartTime,
            ecgEndTime: state => state.ecgEndTime,
            validDates: state => state.validDates,
            currentDateTags: state => state.currentDateTags,
            dateIndex: state => state.dateIndex,
        }),
        ...mapState('afView', {
            selectedTime: state => state.selectedTime,
            selectedRange: state => state.selectedRange
        }),
        startHour() {
            return this.dateIndex > 0 ? 0 : this.toHour(this.ecgStartTime);
        },
        endHour() {
            return this.dateIndex < this.validDates.length - 1 ? 24 : this.toHour(this.ecgEndTime);
        }
    },
    watch: {
        selectedTime() {
            let hour = this.selectedTime / 3600 -
                this.dateIndex * 24 +
                this.toHour(this.ecgStartTime);
            this.clickedLine = {
                ...this.clickedLine,
                position: this.chart.convertToPixel({xAxisIndex: 1}, [hour]),
                hour: hour
            }
        }
    },
    methods: {
        ...mapMutations('afView', [
            'changeSelectedTime',
            'changeSelectedRange',
        ]),
        toOffset(stepMinutes) {
            let hour = parseInt(this.ecgStartTime.substr(this.ecgStartTime.length - 8, 2));
            let min = parseInt(this.ecgStartTime.substr(this.ecgStartTime.length - 5, 2));
            return Math.ceil(((hour - 24 * this.dateIndex) * 60 + min) / stepMinutes);
        },
        toHour(date) {
            if (typeof(date) == "string") {
                date = new Date(date);
            }
            return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
        },
        restrictHour(hour) {
            if (hour < this.startHour) {
                return this.startHour;
            }
            if (hour >= this.endHour) {
                return this.endHour - 1 / 3600;
            }
            return hour;
        },
        selectHour(hour) {
            let dateTime = new Date(this.ecgStartTime);
            dateTime.setDate(dateTime.getDate() + this.dateIndex);
            dateTime.setHours(0, 0, 0);
            dateTime.setSeconds(hour * 3600);
            let position = this.chart.convertToPixel({xAxisIndex: 1}, [hour]);
            this.clickedLine = { ...this.clickedLine, hour: hour, position: position };
            this.changeSelectedTime((dateTime.getTime() - new Date(this.ecgStartTime).getTime()) / 1000);
        },
        selectHourRange(minHour, maxHour, notifyVuex = false) {
            if (notifyVuex) {
                let startDateTime = new Date(this.ecgStartTime);
                startDateTime.setDate(startDateTime.getDate() + this.dateIndex);
                startDateTime.setHours(0, 0, 0);
                startDateTime.setSeconds(minHour * 3600);

                let endDateTime = new Date(this.ecgStartTime);
                endDateTime.setDate(endDateTime.getDate() + this.dateIndex);
                endDateTime.setHours(0, 0, 0);
                endDateTime.setSeconds(maxHour * 3600);

                let selectedRange = {
                    fromTimestamp: startDateTime.getTime(),
                    toTimestamp: endDateTime.getTime(),
                    from: (minHour + this.dateIndex * 24 - this.toHour(new Date(this.ecgStartTime))) * 3600 * 512,
                    to: (maxHour + this.dateIndex * 24 - this.toHour(new Date(this.ecgStartTime))) * 3600 * 512,
                };
                this.changeSelectedRange(selectedRange);
            }

            let left = this.chart.convertToPixel({xAxisIndex: 1}, [minHour]);
            let right = this.chart.convertToPixel({xAxisIndex: 1}, [maxHour]);
            this.xAxisDraggingInfo = {
                ...this.xAxisDraggingInfo,
                left: left,
                width: right - left
            }
        },
        endDragX(event) {
            if (this.xAxisDraggingInfo) {
                var minHour = this.restrictHour(this.xAxisDraggingInfo.hour);
                var maxHour = this.restrictHour(this.chart.convertFromPixel({xAxisIndex: 1}, [event.offsetX]));
                if (minHour > maxHour) {
                    [minHour, maxHour] = [maxHour, minHour];
                }
                this.selectHourRange(minHour, maxHour, this.xAxisDraggingInfo.dirty);
            }
            event.preventDefault();
        },
        mouseEnterEvents(e) {
            if (e.buttons == 0) {
                this.xAxisDraggingInfo = null;
            }
        },
        binarySearch(position) {
            const beats = this.currentDateTags;
            let low = 0;
            let high = beats.length - 1;
            while (low <= high) {
                const mid = (low + high) >>> 1;
                const midPosition = beats[mid].p;
                if (midPosition < position) {
                    low = mid + 1;
                }
                else if (midPosition > position) {
                    high = mid - 1;
                }
                else {
                    return mid; // key found
                }
            }
            return -(low + 1);  // -InsertPosition - 1
        },
        hour2Position(hour) {
            const sh = parseInt(this.ecgStartTime.substr(this.ecgStartTime.length - 8, 2));
            const sm = parseInt(this.ecgStartTime.substr(this.ecgStartTime.length - 5, 2));
            const baseMinute = (this.dateIndex * 1440 - (sh * 60 + sm));
            return Math.round((baseMinute + hour * 60) * (60 * 512));
        },
        position2Hour(position) {
            const sh = parseInt(this.ecgStartTime.substr(this.ecgStartTime.length - 8, 2));
            const sm = parseInt(this.ecgStartTime.substr(this.ecgStartTime.length - 5, 2));
            const baseMinute = (this.dateIndex * 1440 - (sh * 60 + sm));
            return (position / (512 * 60) - baseMinute) / 60;
        },
        bindXAxisEvents() {
            this.chart.getZr().on("click", e => {
                this.xAxisDraggingInfo = null;
                let hour = this.restrictHour(this.chart.convertFromPixel({xAxisIndex: 1}, [e.offsetX]));
                const position = this.hour2Position(hour);
                const index = this.binarySearch(position);
                if (index < 0 && this.currentDateTags.length !== 0) {
                    const nextIndex = -index - 1;
                    let beat = this.currentDateTags[nextIndex];
                    if (nextIndex > 0) {
                        const prevBeat = this.currentDateTags[nextIndex - 1];
                        if (position - prevBeat.p < beat.p - position) {
                            beat = prevBeat;
                        }
                    }
                    console.log("old position: " + position + ", new position: " + beat.p);
                    hour = this.restrictHour(this.position2Hour(beat.p));
                }
                this.selectHour(hour);
                e.event.preventDefault();
            });
            this.chart.getZr().on("mousedown", e => {
                var hour = this.chart.convertFromPixel({xAxisIndex: 1}, [e.offsetX]);
                this.xAxisDraggingInfo = {
                    ...this.xAxisDraggingInfo,
                    hour: hour,
                    left: e.offsetX,
                    width: 0
                };
                e.event.preventDefault();
            });
            this.chart.getZr().on("mousemove", e => {
                let event = e.event ? e.event : window.event;
                if (this.xAxisDraggingInfo && !event.yAxisDraggingInfo && event.buttons == 1) {
                    this.xAxisDraggingInfo.dirty = true;
                    var minHour = this.restrictHour(this.xAxisDraggingInfo.hour);
                    var maxHour = this.restrictHour(this.chart.convertFromPixel({xAxisIndex: 1}, [event.offsetX]));
                    if (minHour > maxHour) {
                        [minHour, maxHour] = [maxHour, minHour];
                    }
                    this.selectHourRange(minHour, maxHour);
                }
                e.event.preventDefault();
            });
            this.chart.getZr().on("mouseup", e => {
                this.endDragX(e.event);
            });
            // this.chart.getZr().dom.addEventListener("mouseleave", e => {
            //     for (var target = e.relatedTarget; target; target = target.parentNode) {
            //         if (target == this.$el) {
            //             return;
            //         }
            //     }
            //     this.endDragX(e);
            // });
            this.chart.getZr().dom.addEventListener("mouseenter", this.mouseEnterEvents);
        }
    },
    beforeDestroy(){
        this.chart.getZr().dom.removeEventListener('mouseenter',this.mouseEnterEvents);
    }
};