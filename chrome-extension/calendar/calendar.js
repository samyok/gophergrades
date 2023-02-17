console.log("calendar.js is loaded");

document.body.onmousedown = appendButton;

const buttonTemplate = 
<div id="calendar_button">
<button class="calendar_button">Export to Google Calendar</button>
</div>

// code to turn template string into an actual html element
const htmlToElement = (html) => {
  const template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
};

//A function to append a new button on the MyU academics tab. 
function appendButton() {
    const newDiv = htmlToElement(buttonTemplate); //This should be a new element node?


    //This is the div that contains buttons "View Calendar" "List View" and "Textbooks (UMTC)"
    const calendarDiv = document.getElementsByClassName("myu_btn-group col-lg-12")[0];

    //A div that holds calendarDiv inside of it
    const parentDiv = document.getElementsByClassName("row")[4];

    if(calendarDiv != null) {
        console.log(calendarDiv);
        console.log(parentDiv);


        parentDiv.insertBefore(newDiv, calendarDiv.nextSibling);

    }else{
        console.log("Button !work");
    }
}