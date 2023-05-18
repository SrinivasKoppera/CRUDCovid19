const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

let db = null;
const dbPath = path.join(__dirname, "covid19India.db");

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`Server is Running at http://localhost:3000`);
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//ConvertDBObjToServerObj
const convertDBObjToServerObj = (dbObj) => {
  const serverObj = {
    stateId: dbObj.state_id,
    stateName: dbObj.state_name,
    population: dbObj.population,
  };
  return serverObj;
};

// Convert Database District Object to Client Object
const convertDatabaseDistrictObjectToClientObject = (districtDBObj) => {
  const obj = {
    districtId: districtDBObj.district_id,
    districtName: districtDBObj.district_name,
    stateId: districtDBObj.state_id,
    cases: districtDBObj.cases,
    cured: districtDBObj.cured,
    active: districtDBObj.active,
    deaths: districtDBObj.deaths,
  };
  return obj;
};

//1.GET All States Details API
app.get("/states", async (request, response) => {
  const getStatesDetailsQuery = `
        SELECT 
        * 
        FROM
            state
        ORDER BY
            state_id;`;
  const stateDetails = await db.all(getStatesDetailsQuery);
  response.send(
    stateDetails.map((eachState) => {
      return convertDBObjToServerObj(eachState);
    })
  );
});

//2. GET Specific State Details API
app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const getSpecificStateQuery = `
    SELECT 
    *
    FROM
        state
    WHERE 
        state_id = ${stateId};`;
  const singleStateDetails = await db.get(getSpecificStateQuery);
  response.send(convertDBObjToServerObj(singleStateDetails));
});

//3.Create a new District API
app.post("/districts/", async (request, response) => {
  const newDistrictDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = newDistrictDetails;
  const addDistrictQuery = `
    INSERT INTO
        district(district_name, state_id, cases, cured, active, deaths)
    VALUES 
        (
            '${districtName}',
            ${stateId},
            ${cases},
            ${cured},
            ${active},
            ${deaths}
        );`;
  const dbResponse = await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

//4. GET Specific District Details API
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictDetails = `
    SELECT 
    *
    FROM
        district
    WHERE 
        district_id = ${districtId};`;
  const districtDetails = await db.get(getDistrictDetails);
  response.send(convertDatabaseDistrictObjectToClientObject(districtDetails));
});

//5.DELETE District Details API
app.delete("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM
        district
    WHERE 
        district_id = ${districtId};`;
  const deleteStatus = await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//6. Update district Details API
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const updatedDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = updatedDetails;
  const updatedDetailsQuery = `
    UPDATE 
        district
    SET 
        district_name = '${districtName}',
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths};`;
  await db.run(updatedDetailsQuery);
  response.send("District Details Updated");
});

//7.GET Specific State Details API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStaticsQuery = `
    SELECT
        SUM(cases) as totalCases,
        SUM(cured) as totalCured,
        SUM(active) as totalActive,
        SUM(deaths) as totalDeaths
    FROM
        district
    WHERE
        state_id = ${stateId};`;
  const dbResponse = await db.get(getStateStaticsQuery);
  response.send(dbResponse);
});

//8.GET the State Name Based On District ID API
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictDetailsQuery = `
    SELECT 
        state_id
    FROM
        district
    WHERE
        district_id = ${districtId};`;
  const dbRep = await db.get(getDistrictDetailsQuery);
  const getStateNameQuery = `
    SELECT
        state_name as stateName
    FROM 
        state
    WHERE
        state_id = ${dbRep.state_id};`;
  const dbResponse = await db.get(getStateNameQuery);
  response.send(dbResponse);
});

module.exports = app;
