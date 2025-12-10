// Configure Calendar
var Calendar = function (model, options) {
    // Default Values
    this.Options = {
        Color: '',
        LinkColor: '',
        NavShow: true,
        NavVertical: false,
        NavLocation: '',
        DateTimeShow: true,
        DateTimeFormat: 'mmm, yyyy',
        DatetimeLocation: '',
        EventClick: '',
        EventTargetWholeDay: false,
        DisabledDays: false,
        ModelChange: model,

        Holidays: [],
        Birthday: undefined,
        LabelAnchors: false,
        OriginMonth: 0,
        SelectCol: undefined,
        SelectDay: undefined,
        ModelType: undefined,
        Availabilities: [],
        Icons: {  }
    };

    // Overwriting default values
    for (var key in options)
        this.Options[key] = typeof options[key] == 'string' ? options[key].toLowerCase() : options[key];

    model ? this.Model = model : this.Model = {};

    this.TodayDate = moment().format('yyyy-MM-DD');
    this.SelectedDate = $("#flatpickr").val() == ''
        ? moment(this.TodayDate).format('yyyy-MM-DD')
        : $("#flatpickr").val()
    this.SelectedDateMondayOffset = moment(this.SelectedDate).day() - 1 == -1
        ? 6
        : moment(this.SelectedDate).day() - 1
    this.StartDate = moment(this.SelectedDate).subtract(this.SelectedDateMondayOffset, 'd').format('yyyy-MM-DD')
};

// Render Calendar
function createCalendar(calendar, element) {
    calendar = new Calendar(calendar.Model, calendar.Options, this.SelectedDate)
    element.innerHTML = '';

    var mainSection = document.createElement('div');
    mainSection.className += "cld-main";

    function generateWeekdayLabels() {
        var weekdayLabels = document.createElement('ul');
        weekdayLabels.className = 'cld-labels';
        var weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        for (let i = 0; i < weekdays.length; i++) {
            var weekday = document.createElement('li');
            weekday.className += "cld-label";
            weekday.innerHTML = weekdays[i];

            if (calendar.Options.LabelAnchors) {
                weekday.id = weekdays[i]
                weekday.style.cursor = 'pointer'

                weekday.onclick = () => calendar.Options.SelectCol(weekdays[i])
            }
            weekdayLabels.appendChild(weekday);
        }
        mainSection.appendChild(weekdayLabels);
    }
    
    function generateDays() {
        var totalDays = 42; // 6 Weeks
        var days = document.createElement('ul');
        days.className += "cld-days";
        
        for (var i = 0; i < totalDays; i++) {
            var date = moment(calendar.StartDate).add(i, 'd').format('yyyy-MM-DD')
            var cssClass = moment(date).isBefore(moment(calendar.TodayDate))
                ? "prevMonth"
                : "currMonth";

            generateDay(days, date, cssClass, i == 0);
        }
        mainSection.appendChild(days);
    }

    function generateDay(container, currentDate, cssClass, firstDay = false) {
        var currentDay = moment(currentDate).format('D');
        var currentDayFormatted = `${(currentDay.length == 1 ? 0 : '')}${currentDay}`;

        // Create Date Entry
        var day = document.createElement('li');
        day.className += `cld-day ${cssClass}`;

        //if (calendar.Options.LabelAnchors) {
            day.className += " p-0";
        //}
        if (moment(currentDate).isBefore(moment(calendar.TodayDate))) {
            day.className += " disableDay";
        } 

        // Create Date Heading
        var header = document.createElement("div");
        header.className += "d-flex justify-content-between align-items-center";
        header.style.borderBottom = "1px solid #ddd";
        if (calendar.Options.LabelAnchors) {
            header.onclick = (e) => calendar.Options.SelectDay(e);
            header.style.cursor = "pointer";
        }

        // Create Date Date
        var dateNumber = document.createElement("p");
        dateNumber.className += "cld-number";
        // Display Month Name in Label when starting new month
        dateNumber.innerHTML = (firstDay || currentDay == 1)
            ? `${currentDayFormatted} | ${moment(currentDate).format('MMMM')}`
            : currentDayFormatted;
        header.appendChild(dateNumber)

        // Create Availability Icons (User Schedule)
        var iconWrapper = document.createElement('div');
        iconWrapper.className = "d-flex";

        let matchingAvailabilityIndex = calendar.Options.Availabilities.findIndex(a => moment(a.DateWeekDate).format('yyyy-MM-DD') == currentDate);
        if (matchingAvailabilityIndex != -1)
            createAvailabilityIcons(calendar, iconWrapper, matchingAvailabilityIndex);
        header.appendChild(iconWrapper)

        // Attach Header
        day.appendChild(header)

        // Populate Body with Event Data
        for (var n = 0; n < calendar.Model.length; n++) {
            // Check Date against Event Dates
            let evDate = Object.keys(calendar.Model[n])[0];

            if (evDate == currentDate) {
                if (calendar.Options.ModelType == "userschedule")
                    dateNumber.className += " eventday";
                dateNumber.className += " ps-1 pt-1";

                var event = document.createElement('div')
                event.className = "cld-event"
                event.innerHTML = assembleEvent(calendar.Model[n], calendar.Options.ModelType)

                if (event.innerHTML == "" && matchingAvailabilityIndex != -1) {
                    event.innerHTML = assembleOffer(calendar, matchingAvailabilityIndex)
                    day.className += " offerDay"
                }

                day.appendChild(event);
            }
        }

        // If Today..
        if (calendar.TodayDate == currentDate) {
            day.className += " today";
            day.style.backgroundColor = "#c3332a";
        } else {
            header.style.backgroundColor = "#eee";
        }
        // If PublicHoliday..
        if (calendar.Options.Holidays.some(date => moment(date).format('yyyy-MM-DD') == currentDate)) {
            day.className += " holiday";
            header.style.backgroundColor = "rgba(76, 123, 199, 0.2)";
        }
        // If Birthday..
        if (calendar.Options.Birthday && moment(calendar.Options.Birthday).format('MM-DD') == moment(currentDate).format('MM-DD')) {
            day.className += " birthday";
        }

        // Attach Day
        container.appendChild(day);
    }

    if (calendar.Options.Color) {
        mainSection.innerHTML += '<style>.cld-main{color:' + calendar.Options.Color + ';}</style>';
    }
    if (calendar.Options.LinkColor) {
        mainSection.innerHTML += '<style>.cld-title a{color:' + calendar.Options.LinkColor + ';}</style>';
    }
    element.appendChild(mainSection);

    generateWeekdayLabels();
    generateDays();

    // Adjust alignment for overflowing departments
    $(".Rostered:truncated").toggleClass("justify-content-center ps-2");
    $(".Confirmed:truncated").toggleClass("justify-content-center ps-2");
}

function assembleEvent(eventData, ModelType) {
    let assembledEvent = ""
    let deficitCount = ""
    let icon = undefined

    switch (ModelType) {
        case "availability":
            for (let value of Object.values(eventData)[0]) { 

                if (value.Icon) icon = `<i class="${value.Icon} fs-3"></i>`

                if (value.HomeDepartmentDeficits > 0)
                {
                    let message = value.HomeDepartmentDeficits > 1 ? "Deficits in your Home Department" : "Deficit in your Home Department";
                    deficitCount = `<span class="homeDepartmentDeficitIndicator p-1"
                                          style="position: absolute; right: 5%; pointer-events: none;"
                                          title="${value.HomeDepartmentDeficits} ${message}">
                                          ${value.HomeDepartmentDeficits}
                                    </span>`
                }
                else
                    deficitCount = ""

                assembledEvent += `<div class="${value.BaseClass} ${value.ExtendedClass} overflow-ellipsis" 
                                        style="${value.BaseStyle}; background-color: ${value.BackgroundColour};" 
                                        title="${value.DepartmentName ?? value.Note ?? ''}"
                                        data-dateweek="${value.Date}" 
                                        data-shifttype="${value.ShiftTypeId}" 
                                        data-availability="${value.AvailabilityStatusId}">
                                        ${icon ?? value.DepartmentName ?? value.ShiftType}
                                        ${deficitCount}
                                    </div>`
            }
            break;
        case "userschedule":
            for (let value of Object.values(eventData)[0]) {
                assembledEvent += `
                <div class="d-flex flex-column justify-content-center align-items-center p-3">
                    <div class="d-flex justify-content-center align-items-center">
                        <b>${value?.DepartmentName}</b>
                   </div>
                    <div class="d-flex justify-content-center align-items-center">
                        <div class="d-none d-md-block">${MomentTimeLT(value?.StartDate)} - ${MomentTimeLT(value.EndDate)}</div>
                        <div class="d-md-none d-sm-flex flex-column"><div>${MomentTimeLT(value?.StartDate)}</div><div>to</div><div>${MomentTimeLT(value.EndDate)}</div></div>
                    </div>
                    <div class="d-flex justify-content-center align-items-center" style="color: ${value?.BackgroundColour}">
                        ${value.AllocationStatus}
                    </div>
                </div>`
            }
            break;
        default:
            break;
    }

    return assembledEvent
}

function assembleOffer(calendar, index) {
    let value = calendar.Options.Availabilities[index].Offer.WorkforceRequest

    return `
        <div class="hover-hidden-offer d-flex flex-column justify-content-center align-items-center p-3 w-100 h-100">
            <div class="d-flex justify-content-center align-items-center">
                <b>${value?.DepartmentName}</b>
           </div>
            <div class="d-flex justify-content-center align-items-center">
                <div class="d-none d-md-block">${MomentTimeLT(value?.StartDate)} - ${MomentTimeLT(value.EndDate)}</div>
                <div class="d-md-none d-sm-flex flex-column"><div>${MomentTimeLT(value?.StartDate)}</div><div>to</div><div>${MomentTimeLT(value.EndDate)}</div></div>
            </div>
            <div class="d-flex justify-content-center align-items-center" style="color: #ff5600">
                Offer
            </div>
        </div>`
}

function createAvailabilityIcons(calendar, iconWrapper, index) {
    if (calendar.Options.Availabilities[index].AM || calendar.Options.Availabilities[index].PM || calendar.Options.Availabilities[index].ND) {
        let icon = document.createElement('i')
        icon.classList = `${calendar.Options.Icons.Offer} mx-1`
        iconWrapper.appendChild(icon)
    }
}

function caleandar(el, data, settings) {
    var obj = new Calendar(data, settings);
    createCalendar(obj, el);
}