function fileDownload(stringData){
    // Create element with <a> tag
    const link = document.createElement("a");
    
    // Create a blog object with the file content which you want to add to the file
    const file = new Blob([stringData], { type: 'text/plain' });
    
    // Add file content in the object URL
    link.href = URL.createObjectURL(file);
    
    // Add file name
    link.download = "cal.ics";
    
    // Add click event to <a> tag to save file.
    link.click();
    URL.revokeObjectURL(link.href);
}

function pad(n){ //ensures numbers are 2 digits long
  if (n<10) return "0"+n
  return n
}

function formatDate(h, m, date){ //Format: YYYYMMDDTHHMMSS
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}T${pad(h)}${pad(m)}00`
}

function getTimes(timeRange, date){ //gets start and end times for event
  let [t1, _, t2, end] = timeRange.split(" ")
  let [t1H,t1M] = t1.split(":")
  let [t2H,t2M] = t2.split(":")
  t1H = Number(t1H)
  t1M = Number(t1M)
  t2H = Number(t2H)
  t2M = Number(t2M)
  if (end == "PM"){
    if (t2H != 12){
      t2H += 12
    }
    if (t1H < 8){ //only AM/PM for end time is given
      t1H += 12   //guess if start should be AM or PM bases on start
    }
  }
  return [formatDate(t1H,t1M,date),formatDate(t2H,t2M,date)]
}


function createVEVENT(data){ //create EVENT calendar lines
  let [startDate, endDate] = getTimes(data.timeRange, data.date)
  return `BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
LOCATION:${data.room}
SUMMARY:${data.courseName + " " +data.meetingType}
END:VEVENT
`
}


function createData(data){ //creates ics file string
  console.log("Started createData")
  let ouputString = `BEGIN:VCALENDAR
PRODID:-//GopherGrades//Classes//EN
VERSION:1.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME: Class Calendar
X-WR-TIMEZONE:America/Chicago
`
  for (week of data.weeks){
    for (classEvent of week){
      ouputString += createVEVENT(classEvent)
    }
  }
  ouputString += `END:VCALENDAR`
  console.log(ouputString)
  return ouputString
}

//button should run this command: fileDownload(createData(await scrapeASemester()))
