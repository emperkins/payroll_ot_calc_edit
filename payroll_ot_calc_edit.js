// https://tc39.github.io/ecma262/#sec-array.prototype.includes
if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, 'includes', {
        value: function (searchElement, fromIndex) {

            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }

            // 1. Let O be ? ToObject(this value).
            var o = Object(this);

            // 2. Let len be ? ToLength(? Get(O, "length")).
            var len = o.length >>> 0;

            // 3. If len is 0, return false.
            if (len === 0) {
                return false;
            }

            // 4. Let n be ? ToInteger(fromIndex).
            //    (If fromIndex is undefined, this step produces the value 0.)
            var n = fromIndex | 0;

            // 5. If n ≥ 0, then
            //  a. Let k be n.
            // 6. Else n < 0,
            //  a. Let k be len + n.
            //  b. If k < 0, let k be 0.
            var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

            function sameValueZero(x, y) {
                return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
            }

            // 7. Repeat, while k < len
            while (k < len) {
                // a. Let elementK be the result of ? Get(O, ! ToString(k)).
                // b. If SameValueZero(searchElement, elementK) is true, return true.
                if (sameValueZero(o[k], searchElement)) {
                    return true;
                }
                // c. Increase k by 1.
                k++;
            }

            // 8. Return false
            return false;
        }
    });
}

function isEmpty(value) {
    if (value === null) {
        return true;
    }
    else if (value === undefined) {
        return true;
    }
    else if (value === 'undefined') {
        return true;
    }
    else if (value === '') {
        return true;
    }
    else {
        return false;
    }
}

function overtimeEntryForm(request, response) {
    // Setup the form
    var form = nlapiCreateForm('Payroll Overtime Calc', false);
    //form.setScript('customscript_facs_forecast_form_client');
    form.addField('custpage_startdate', 'date', 'Pay Period Start Date');
    form.addField('custpage_enddate', 'date', 'Pay Period End Date');
    form.addSubmitButton('Calculate Overtime');
    form.addButton('custpage_cancel', 'Cancel', 'window.history.back();');
    return form;
}

function makeList(arry, field) {
    var list = arry.map(function (rec) {
        return rec[field];
    });
    var cleanList = list.filter(function (elem, index, self) {
        return index === self.indexOf(elem);
    });
    return cleanList;
}

function makeBaseRecords(request) {
    var startDate = request.getParameter('custpage_startdate');
    var endDate = request.getParameter('custpage_enddate');
    var californiaLocations = ['LA', 'SAC', 'SD', 'SF'];
    var timeArry = [];
    var dtFilter = new nlobjSearchFilter('date', null, 'within', startDate, endDate);
    var rslts = nlapiSearchRecord('timebill', 1568, dtFilter, null);
    rslts.forEach(function (rec) {
        var emp = {};
        emp.employee = rec.getText('employee');
        emp.date = rec.getValue('date');
        emp.durationdecimal = rec.getValue('durationdecimal');
        emp.workplace = rec.getText('workplace', 'employee');
        if (californiaLocations.includes(emp.workplace)) {
            emp.caGroup = true;
        }
        else {
            emp.caGroup = false;
        }
        timeArry.push(emp);
    });
    return timeArry;
}

function empTimeEntries(arry) {
    var emp = makeList(arry, 'employee');
    var empTimeArry = [];
    emp.forEach(function (empId) {
        var obj = {};
        obj.employee = empId;
        obj.caGroup = false;
        obj.timeEntries = [];
        arry.forEach(function (rec) {
            var timeObj = {};
            if (rec.employee === empId) {
                obj.caGroup = rec.caGroup;
                timeObj.date = rec.date;
                timeObj.time = rec.durationdecimal;
                obj.timeEntries.push(timeObj);
            }
        });
        empTimeArry.push(obj);
    });
    return empTimeArry;
}

function getWeekTwoStart(startDate) {
    var dt = nlapiStringToDate(startDate);
    return nlapiAddDays(dt, 7);
}

function setWeekSegment(timeEntryDate, startDate) {
    var weekTwoStart = getWeekTwoStart(startDate);
    var entryDate = nlapiStringToDate(timeEntryDate);
    return (entryDate < weekTwoStart) ? 1 : 2;
}

// ***set day number functions

function setDayNumber(dt) {
    var day = {};
    day.Two = nlapiAddDays(dt, 1);
    day.Three = nlapiAddDays(dt, 2);
    day.Four = nlapiAddDays(dt, 3);
    day.Five = nlapiAddDays(dt, 4);
    day.Six = nlapiAddDays(dt, 5);
    day.Seven = nlapiAddDays(dt, 6);
    day.forEach(function (entryDate) {
        if (entryDate < day.Two) {
            return 1;
        }
        else if (entryDate < day.Three) {
            return 2;
        }
        else if (entryDate < day.Four) {
            return 3;
        }
        else if (entryDate < day.Five) {
            return 4;
        }
        else if (entryDate < day.Six) {
            return 5;
        }
        else if (entryDate < day.Seven) {
            return 6;
        }
        else {
            return 7;
        }
    });
}

// ***determining isSeventhConsec???
function isSeventhConsec(timeObj) {

}

function sumAndSegmentTime(arry, periodStartDate) {
    var list = [];
    return arry.map(function (empRec) {
        var obj = {};
        obj.employee = empRec.employee;
        obj.caGroup = empRec.caGroup;
        obj.sumTime = [];

        var dateList = makeList(empRec.timeEntries, 'date');
        dateList.forEach(function (dt) {
            var sumByDateObj = {};
            sumByDateObj.date = dt;
            sumByDateObj.week_num = 0;
            // ***day of week number
            sumByDateObj.day_num = 0;
            sumByDateObj.total_hrs = 0;
            empRec.timeEntries.forEach(function (timeRec) {
                var duration = parseFloat(timeRec.time);
                if (timeRec.date === dt) {
                    sumByDateObj.total_hrs += duration;
                }
            });
            // Set the week segment ( 1 = week 1, 2 = week 2)
            sumByDateObj.week_num = setWeekSegment(sumByDateObj.date, periodStartDate);
            // ***Set the day number ( 1 = day 1, 2 = day 2, etc.)
            sumByDateObj.day_num = setDayNumber(sumByDateObj.date, periodStartDate)
            obj.sumTime.push(sumByDateObj);
        });
        return obj;
    });
}

function segmentByState(arry) {
    return arry.map(function (empRec) {
        var obj = {};
        obj.employee = empRec.employee;
        obj.caGroup = empRec.caGroup;
        obj.reg_hrs = 0;
        obj.ot_hrs = 0;
        obj.dt_hrs = 0;
        // ***calculate total for each day
        obj.day_one_total = 0;
        obj.day_two_total = 0;
        obj.day_three_total = 0;
        obj.day_four_total = 0;
        obj.day_five_total = 0;
        obj.day_six_total = 0;
        obj.day_seven_total = 0;
        // ***determine if day is the seventh consecutive day worked
        obj.is_seventh_consec = isSeventhConsec(timeObj);
        obj.wk_one_total = 0;
        obj.wk_two_total = 0;
        obj.total_hrs = 0;
        obj.payrollState = '';

        empRec.sumTime.forEach(function (timeObj) {
            var totHr = timeObj.total_hrs;
            var overEight = totHr - 8;
            if (empRec.caGroup) {
                if (timeObj.is_seventh_consec === false) {
                    if (overEight > 0) {
                        // set the first 8 hours as regular time
                        //obj.reg_hrs += 8;
                        (timeObj.week_num === 1) ? obj.reg_hrs += 8 : obj.reg_hrs += 8;
                        // Calculate the OT and DT hours
                        if (overEight <= 4) {
                            obj.ot_hrs += overEight;
                        }
                        // If the OT hours are greater than 4, we have to calc double time for California
                        else {
                            obj.ot_hrs += 4;
                            obj.dt_hrs += overEight - 4;
                        }
                        (timeObj.week_num === 1) ? obj.wk_one_total += totHr : obj.wk_two_total += totHr;
                    }
                    else {
                        (timeObj.week_num === 1) ? obj.wk_one_total += totHr : obj.wk_two_total += totHr;
                    }
                }
                else {
                    // *** when timeObj is seventh consecutive day
                    if (overEight > 0) {
                        // Calculate the OT and DT hours
                        obj.ot_hrs += 8;
                        obj.dt_hrs += overEight;
                    }
                    else {
                        obj.ot_hrs += tothr;
                    }
                }
            }
            else {
                // Not California - Calc based on total hours in 40 hr work week
                (timeObj.week_num === 1) ? obj.wk_one_total += totHr : obj.wk_two_total += totHr;
            }
        });
        return obj;
    });
}

function makeFinalPayrollList(arry) {
    var list = [];
    arry.forEach(function (empRec) {
        if (empRec.caGroup) {
            if (empRec.wk_one_total > 40) {
                // ***still working on this
            }
            else {
                // CA week one total is 40 hrs or less
                empRec.reg_hrs += empRec.wk_one_total;
            }
            if (empRec.wk_two_total > 40) {
                // ***still working on this
            }
            else {
                // CA week one total is 40 hrs or less
                empRec.reg_hrs += empRec.wk_two_total;
            }
        }
        else {
            // Pay calc outside of California
            if (empRec.wk_one_total > 40) {
                empRec.reg_hrs += 40;
                empRec.ot_hrs += empRec.wk_one_total - 40;
            }
            else {
                empRec.reg_hrs += empRec.wk_one_total;
            }
            if (empRec.wk_two_total > 40) {
                empRec.reg_hrs += 40;
                empRec.ot_hrs += empRec.wk_two_total - 40;
            }
            else {
                empRec.reg_hrs += empRec.wk_two_total;
            }
        }
        list.push(empRec);
    });
    return list;
}

function calcOvertime(request) {
    //var startDate = '1/22/2018';
    var startDate = request.getParameter('custpage_startdate');
    //var endDate = request.getParameter('custpage_enddate');
    var baseData = makeBaseRecords(request);
    // Update baseData with California group boolean
    //addCaliforniaLocations(baseData);
    // Create the time array for each employee
    var empList = empTimeEntries(baseData);
    var sumList = sumAndSegmentTime(empList, startDate);
    var segmentStateList = segmentByState(sumList);
    var finalList = makeFinalPayrollList(segmentStateList);

    return finalList;
}

function formattedResults(arry) {
    return arry.map(function (rec) {
        var obj = {};
        obj.employee = rec.employee;
        obj.reg_hours = rec.reg_hrs;
        obj.ot_hours = rec.ot_hrs;
        obj.dt_hours = rec.dt_hrs;
        obj.total_hours = rec.reg_hrs + rec.ot_hrs + rec.dt_hrs;
        (rec.caGroup) ? obj.pay_state = 'California' : obj.pay_state = 'Other';

        return obj;
    });
}

function overtimeResultsForm(request, response) {
    var data = [
        {
            employee: 'Jeff',
            reg_hours: 4,
            ot_hours: 2,
            dt_hours: 1,
            total_hours: 7
        },
        {
            employee: 'Bill',
            reg_hours: 4,
            ot_hours: 2,
            dt_hours: 1,
            total_hours: 7
        }
    ];
    var startDate = request.getParameter('custpage_startdate');
    var endDate = request.getParameter('custpage_enddate');
    var rslts = calcOvertime(request);
    var formatResults = formattedResults(rslts);
    var form = nlapiCreateList('Payroll Overtime Calculation Results', false);
    // Set the display columns
    form.addColumn('employee', 'text', 'Employee');
    form.addColumn('reg_hours', 'float', 'Regular Hours');
    form.addColumn('ot_hours', 'float', 'Overtime Hours');
    form.addColumn('dt_hours', 'float', 'Double Time Hours');
    form.addColumn('total_hours', 'float', 'Total Hours');
    form.addColumn('pay_state', 'text', 'State');

    form.addRows(formatResults);

    return form;
}

function payrollOvertimeCalc(request, response) {
    try {
        var reqType = request.getMethod();
        if (reqType === 'GET') {
            // Verify start date is at least one week in the past and starts on a Monday
            // Verify the date range is exactly two weeks
            response.writePage(overtimeEntryForm(request));
        }
        if (reqType === 'POST') {
            var startDate = request.getParameter('custpage_startdate');
            var endDate = request.getParameter('custpage_enddate');

            response.writePage(overtimeResultsForm(request, response));
        }
    }
    catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
        }
        else {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
        }
    }
}
