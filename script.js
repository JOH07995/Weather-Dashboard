//declare a bunch of things
var APIKey = "c74da9e1303b43a921166df9ba04223e";
var wsKey = "weatherSearches"
var searchedDiv = $("#searched");
var searchInput = $("#searchInput");
var searchButton = $("#searchBtn");
var currentWeatherDiv = $("#currentWeather");
var forecastDiv = $("#forecast");
var clearBtn = $("#clear");
var storedSearches = getStoredSearches();
var addedCity = newCity();
var metricUnits = { deg: "C", speed: "KPH" };
var impUnits = { deg: "F", speed: "MPH" };
var units = impUnits;

// kick things off
function init() {

    //enable tooltip
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    });

    buildSearchHistory();

    if (storedSearches != null) {
        getWeather(storedSearches[0]);
    }

    //handles enter key like a button press
    searchInput.on("keyup", function (event) {
        if (event.key === "Enter") {
            searchButtonClicked();
        };
    });

    searchButton.on("click", searchButtonClicked);
    clearBtn.on("click", clearSearches);
};

// add the buttons of searched cities to the page
function buildSearchHistory() {

    searchedDiv.empty();

    if (storedSearches != null) {
        storedSearches.forEach(element => {
            searchedDiv.append(
                $("<button>")
                    .text(correctCase(element.city) + ", " + element.country.toUpperCase())
                    .addClass("btn btnCitySearch")
                    .on("click", function () {
                        getWeather(element);
                    })
            );
        });
    }
}

// clear search input once clicked, run getWeather
function searchButtonClicked() {

    var cityVal = searchInput.val().trim();
    var city = newCity(cityVal, null);
    getWeather(city);
    searchInput.val("");
}

// get weather for the input city
function getWeather(city) {
    addedCity = city;
    var queryURLCurrent = "";
    var queryURLForecast = "";

    if (city.country == null) {
        queryURLCurrent = "https://api.openweathermap.org/data/2.5/weather?q=" + city.city + "&units=metric&appid=" + APIKey;
        queryURLForecast = "https://api.openweathermap.org/data/2.5/forecast?q=" + city.city + "&units=metric&appid=" + APIKey;
    } else {
        queryURLCurrent = "https://api.openweathermap.org/data/2.5/weather?q=" + city.city + "," + city.country + "&units=metric&appid=" + APIKey;
        queryURLForecast = "https:////api.openweathermap.org/data/2.5/forecast?q=" + city.city + "," + city.country + "&units=metric&appid=" + APIKey;
    }

    ajaxAPIGET(queryURLCurrent, buildCurrentWeather);
    ajaxAPIGET(queryURLForecast, buildForecastWeather);
}

// for current weather, constructs the relevant data together to display
function buildCurrentWeather(data) {
    console.log(data);
    if (data != null) {
        console.log(units, metricUnits, data.wind.speed);
        currentWeatherDiv.empty();
        currentWeatherDiv.append(
            $("<h3>").text(correctCase(data.name) + ", "
                + data.sys.country.toUpperCase())
            , $("<h4>").text(moment.unix(data.dt).format("dddd, MMM Do YYYY"))
                .append($("<img>").attr("src", "https://openweathermap.org/img/wn/" + data.weather[0].icon + "@2x.png")
                    .addClass("currentWeatherImg")
                    .attr("data-toggle", "tooltip")
                    .attr("data-placement", "right")
                    .attr("title", data.weather[0].description)
                    .tooltip())
            , $("<p>").text("Temperature: " + Math.round(data.main.temp) + "°" + units.deg)
            , $("<p>").text("Humidity: " + data.main.humidity + "%")
            , $("<p>").text("Wind Speed: " + (Math.round((units === metricUnits) ? (data.wind.speed * 3.6) : data.wind.speed)) + " " + units.speed)
            , $("<p>").text("UV Index: ").append($("<div>").attr("id", "UVIndex"))
        );

        var UVqueryURL = "https://api.openweathermap.org/data/2.5/uvi?appid=" + APIKey + "&lat=" + data.coord.lat + "&lon=" + data.coord.lon;

        ajaxAPIGET(UVqueryURL, buildUV);

        if (addedCity.country == null) {
            addedCity.country = data.sys.country;
            addedCity.city = data.name;
            addNewSearch(addedCity);
            addedCity = null;
        }

    } else {
        alert("Something went wrong getting current weather data, please try again");
    }
}

// UV index data to add to page
function buildUV(data) {
    if (data != null) {

        var UVIndex = data.value;
        var uvDiv = $("#UVIndex").attr("data-toggle", "tooltip");
        var severity = "";
        var UVbg = null;
        var textColor = null;
        var borderColor = null;

        //determine UV Index Severity level to color code
        if (UVIndex < 2) {
            UVbg = "green";
            textColor = "white";
            severity = "Low";
            borderColor = "rgb(18, 130, 16)";
        } else if (UVIndex < 6) {
            UVbg = "yellow";
            severity = "Moderate";
            borderColor = "rgb(250, 246, 56)";
        } else if (UVIndex < 8) {
            UVbg = "orange";
            severity = "High";
            borderColor = "rgb(250, 180, 51)";
        } else if (UVIndex < 11) {
            UVbg = "red";
            textColor = "white";
            severity = "Very High";
            borderColor = "rgb(250, 55, 54)";
        } else {
            UVbg = "viovar";
            severity = "Extreme";
            borderColor = "rgb(235, 150, 236)";
        }

        uvDiv.attr("title", severity)
            .attr("data-placement", "right")
            .tooltip()
            .css("backgroundColor", UVbg)
            .css("borderColor", borderColor);

        if (textColor != null) {
            uvDiv.css("color", textColor);
        }

        uvDiv.text(UVIndex);
    } else {
        alert("Something went wrong getting UV data, please try again.");
    }
}


// forecast weather
function buildForecastWeather(data) {
    if (data != null) {

        forecastDiv.empty();

        var dayCardContainer = $("<div>").attr("id", "dayCardContainer").addClass("row")

        forecastDiv.append($("<h3>").text("5-Day Forecast:"), dayCardContainer);
        dailyData = parseDailyData(data);

        dailyData.forEach(element => {
            dayCardContainer.append(buildForecastCard(element));
        });

    } else {
        alert("Something went wrong getting forecast data, please try again");
    }
}


// parse the data out from the ajax GET
function parseDailyData(data) {

    var dailyData = [];

    for (var i = 5; i < data.list.length; i += 8) {

        var dataList = data.list[i];

        dailyData.push(newDay(dataList.dt,
            dataList.weather[0].icon,
            dataList.weather[0].description,
            dataList.main.temp,
            dataList.main.humidity));
    }
    return dailyData;
}

// builds a card per day of the 5-day forecast
function buildForecastCard(day) {
    var dayCard = $("<div>").attr("class", "dayCard col-12 col-md-5 col-lg-2");

    dayCard.append(
        $("<label>").text(getDayOfWeek(day.date)),
        $("<label>").text(moment.unix(day.date).format("MMM Do YYYY")),
        $("<img>").attr("src", "https://openweathermap.org/img/wn/" + day.icon + ".png")
            .attr("title", day.description)
            .attr("data-placement", "right")
            .attr("data-toggle", "tooltip")
            .tooltip(),
        $("<p>").text("Temperature: " + Math.round(day.temp) + "°" + units.deg),
        $("<p>").text("Humidity: " + day.humidity + "%")
    );

    return dayCard;
}

// adds the search city if not present in Local Storage
function addNewSearch(city) {
    console.log(city, storedSearches);
    if (storedSearches == null) {
        storedSearches = [];
    }
    //put the newest city at the top
    storedSearches.unshift(city);

    localStorage.setItem(wsKey, JSON.stringify(storedSearches));

    buildSearchHistory();
}

// clear it out
function clearSearches() {

    localStorage.removeItem(wsKey);
    searchedDiv.empty();
    storedSearches = null;
}



//start
init();

//useful functions
function getDayOfWeek(date) {
    return moment.unix(parseInt(date)).format('dddd');
}

// https://stackoverflow.com/a/38530325/13118668 - capitalize function
function correctCase(str) {
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

function getStoredSearches() {
    return JSON.parse(localStorage.getItem(wsKey));
}

function newCity(city, country) {
    return { city: city, country: country };
}

function ajaxAPIGET(queryURL, callbackFunction) {
    $.ajax({ url: queryURL, method: "GET" }).then(function (response) {
        callbackFunction(response);
    });
}

function newDay(date, icon, description, temp, humidity) {
    return { date: date, icon: icon, description: description, temp: temp, humidity: humidity };
}