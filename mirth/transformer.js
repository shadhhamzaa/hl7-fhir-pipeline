// From PID
var mrn = msg['PID']['PID.3']['PID.3.1'].toString();
var familyName = msg['PID']['PID.5']['PID.5.1'].toString();
var givenName = msg['PID']['PID.5']['PID.5.2'].toString();
var dob = msg['PID']['PID.7']['PID.7.1'].toString();
var hl7Gender = msg['PID']['PID.8']['PID.8.1'].toString();
var addressLine = msg['PID']['PID.11']['PID.11.1'].toString();
var city = msg['PID']['PID.11']['PID.11.3'].toString();
var postcode = msg['PID']['PID.11']['PID.11.5'].toString();
var phone = msg['PID']['PID.13']['PID.13.1'].toString();

// From PV1
var patientClass = msg['PV1']['PV1.2']['PV1.2.1'].toString();
var ward = msg['PV1']['PV1.3']['PV1.3.1'].toString();
var room = msg['PV1']['PV1.3']['PV1.3.2'].toString();
var bed = msg['PV1']['PV1.3']['PV1.3.3'].toString();
var attendingId = msg['PV1']['PV1.7']['PV1.7.1'].toString();
var attendingFamily = msg['PV1']['PV1.7']['PV1.7.2'].toString();
var attendingGiven = msg['PV1']['PV1.7']['PV1.7.3'].toString();
var hospitalService = msg['PV1']['PV1.10']['PV1.10.1'].toString();
var visitNumber = msg['PV1']['PV1.19']['PV1.19.1'].toString();
var admitDateTime = msg['PV1']['PV1.44']['PV1.44.1'].toString();
var dischargeDateTime = msg['PV1']['PV1.45']['PV1.45.1'].toString();

// From MSH
var sendingFacility = msg['MSH']['MSH.4']['MSH.4.1'].toString();
var messageType = msg['MSH']['MSH.9']['MSH.9.2'].toString();


var ORG_LOOKUP = {
  'RVJ01': 'Example Trust - Main Hospital',
  'RVJ02': 'Example Trust - Community Site'
};
var DEFAULT_ORG = 'Unknown Facility';

function mapEncounterClass(hl7PatientClass) {
  switch (hl7PatientClass) {
    case 'I':
      return 'IMP';
    case 'O':
      return 'AMB';
    case 'E':
      return 'EMER';
    default:
      return 'UNK';
  }
}

function mapGender(hl7Gender) {
  switch (hl7Gender) {
    case 'M':
      return 'male';
    case 'F':
      return 'female';
    case 'O':
      return 'other';
   default:
      return 'unknown';
  }
}

function mapEncounterStatus(messageType, dischargeDateTime) {
  if (messageType ==="A03" || dischargeDateTime !== "") {
    return 'finished';
  } else {
    return 'in-progress';
  }
}

var organizationName;
if (sendingFacility in ORG_LOOKUP) {
  organizationName = ORG_LOOKUP[sendingFacility];
} else {
  organizationName = DEFAULT_ORG;
}


function hl7ToFhirDate(dob) {
  if (dob !== "") {
    var year = dob.substring(0, 4);
    var month = dob.substring(4, 6);
    var day = dob.substring(6, 8);
    return year + "-" + month + "-" + day;
  }
  return null;
}

function hl7ToFhirDateTime(date) {
  if (date !== "") {
    var year = date.substring(0, 4);
    var month = date.substring(4, 6);
    var day = date.substring(6, 8);
    var timehr = date.substring(8,10);
    var timemin = date.substring(10,12);
    var timesec = date.length >= 14 ? date.substring(12,14) : "00";
    return year + "-" + month + "-" + day+"T"+timehr+":"+timemin+":"+timesec;
  }
  return null;
}


function v(value) {
  return value !== "" ? value : undefined;
}




var patientResource = {
  "resourceType": "Patient",
  "id": "patient-" + mrn,
  "identifier": [
  {
    "system": "https://fhir.example-nhs-trust.org/Id/local-mrn",
    "value": mrn
  }
 ],
 "name": [
  {
    "family": familyName,
    "given": [givenName]
  }
],
  "gender": mapGender(hl7Gender),
  "birthDate": v(hl7ToFhirDate(dob)),
  "address" : addressLine !== "" ? [
  {
   	"line" :[addressLine],
  	"city":v(city),
  	"postalCode":v(postcode)
  }
 ]:undefined,          //JSON.stringify completely omits any field set to undefined, as if it was never there.
 "telecom": phone!==""? [
  {
 	"system": "phone",
 	"value": v(phone)
  }
 ]:undefined,
 "managingOrganization": {
 	"display": organizationName
 }
};


var encounterResource = {
	"resourceType": "Encounter",
	//"id": "encounter-"+visitNumber,
	"id": "encounter-" + (visitNumber !== "" ? visitNumber : mrn ),
	"status": mapEncounterStatus(messageType, dischargeDateTime),
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": mapEncounterClass(patientClass)
  },
  "subject": {
    "reference": "Patient/patient-" + mrn
  },
  "participant": attendingId!==""? [
    {
      "individual": {
        "display": "DR" +" "+v(attendingGiven+" "+attendingFamily)
      }
    }
  ]:undefined,
  
  "period": {
    //"start": hl7ToFhirDateTime(admitDateTime),
    "start": admitDateTime !== "" ? hl7ToFhirDateTime(admitDateTime) : undefined,
    "end": dischargeDateTime !== "" ? hl7ToFhirDateTime(dischargeDateTime): undefined
  },
  "location": ward !==""? [
    {
      "location": {
        "display": v(ward+","+" " +room+","+" "+bed)
      }
    }
  ]:undefined,
  "serviceProvider": {
    "display": organizationName
  }
}



var organizationResource = {
  "resourceType": "Organization",
  "id": "org-"+ sendingFacility,
  "identifier": [
    {
      "system": "https://fhir.nhs.uk/Id/ods-organization-code",
      "value": sendingFacility
    }
  ],
  "name": organizationName
}

// for supabase fields, matching spec

var patientRow = {
  "id": "patient-" + mrn,
  "mrn": mrn,
  "family_name": familyName,
  "given_name": givenName,
  "gender": mapGender(hl7Gender),
  "birth_date": hl7ToFhirDate(dob),
  "address_line": v(addressLine),
  "city": v(city),
  "postal_code": v(postcode),
  "phone": v(phone),
  "organization": organizationName,
  "resource": JSON.parse(JSON.stringify(patientResource))
};

var encounterRow = {
  "encounter_id": visitNumber !== "" ? visitNumber : mrn,
  "patient_id": "patient-" + mrn,
  "status": mapEncounterStatus(messageType, dischargeDateTime),
  "encounter_class": mapEncounterClass(patientClass),
  "participant": attendingFamily !== "" ? "DR " + attendingGiven + " " + attendingFamily : null,
  "admit_datetime": admitDateTime !== "" ? hl7ToFhirDateTime(admitDateTime) : null,
  "discharge_datetime": dischargeDateTime !== "" ? hl7ToFhirDateTime(dischargeDateTime) : null,
  "ward": v(ward),
  "room": v(room),
  "bed": v(bed),
  "service_provider": organizationName,
  "hospital_service": v(hospitalService),
  "resource": JSON.parse(JSON.stringify(encounterResource))
};


//Mirth's built-in mechanism for passing data between the transformer and destinations

channelMap.put('fhirPatient', JSON.stringify(patientResource));
channelMap.put('fhirEncounter', JSON.stringify(encounterResource));
channelMap.put('fhirOrganization', JSON.stringify(organizationResource));
channelMap.put('patientRow', JSON.stringify(patientRow));
channelMap.put('encounterRow', JSON.stringify(encounterRow));


//logs

logger.info('PATIENT: ' + JSON.stringify(patientResource));
logger.info('ENCOUNTER: ' + JSON.stringify(encounterResource));
logger.info('ORGANIZATION: ' + JSON.stringify(organizationResource));