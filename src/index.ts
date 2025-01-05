import axios from 'axios';
import dotenv from "dotenv";
import { google } from "googleapis";
import { formatInTimeZone } from 'date-fns-tz'; // Importar funciones para manejar zonas horarias
import { emailAccountBalance } from "./emailService"
dotenv.config();

// Define an interface for the balance object


async function fetchDataFluxAndUpdateSheet(): Promise<string | undefined> {
    try {
        // Verificar si las variables de entorno están definidas
        if (!process.env.FLUX_URL || !process.env.FLUX_ADRESS) {
            throw new Error('Las variables de entorno FLUX_URL, FLUX_ADRESS, GOOGLE_SHEET_ID o GOOGLE_SHEET_API_KEY no están definidas.');
        }

        const response = await axios.get(`${process.env.FLUX_URL}?address=${process.env.FLUX_ADRESS}`);
        let data = response.data.data;
        const valueFlux = data / 100000000;
        const refactorData = valueFlux.toString();

        if (valueFlux < 100) {
            emailAccountBalance();
        }
        // Actualizar la celda A2 en Google Sheets
        return refactorData;

    } catch (error) {
        console.error('Error fetching data:', error);
        return undefined; // Ensure a return value in case of error
    }
}

async function fetchDataAkashAndUpdateSheet(): Promise<string | undefined> {
    try {
        // Verificar si las variables de entorno están definidas
        if (!process.env.AKASH_MNEMONIC) {
            throw new Error('Las variables de entorno AKASH_MNEMONIC no están definidas.');
        }
        const endpoint = await axios.get('https://akash-api.polkachu.com/cosmos/bank/v1beta1/balances/akash14wj92ajcmnmtal6cz8yzqfmuped47r7ewts5r7');

        let data = endpoint.data.balances[0].amount;
        let refactorData = Number(data) / 1000000;
        const cleanData = refactorData.toString();

        if (refactorData < 50) {
            emailAccountBalance();
        }
        return cleanData;

    } catch (error) {
        console.error('Error fetching data:', error);
        return undefined; // Ensure a return value in case of error
    }
}

async function updateGoogleSheet() {

    const fluxValue = await fetchDataFluxAndUpdateSheet()
    const akashValue = await fetchDataAkashAndUpdateSheet()

    const date = new Date()
    const argentinaTime = formatInTimeZone(date, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd HH:mm:ssXXX')
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;


    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: "credentials.json",
            scopes: "https://www.googleapis.com/auth/spreadsheets",
        })
        const client = await auth.getClient() as any;


        const googleSheets = google.sheets({ version: "v4", auth: client });



        // const getRows = await googleSheets.spreadsheets.values.get({
        //     auth,
        //     spreadsheetId,
        //     range: "Account1balance",
        // });


        await googleSheets.spreadsheets.values.append({
            spreadsheetId,
            range: "Account1balance!A2",
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [[fluxValue, akashValue, argentinaTime]],
            },
        });

    } catch (error) {
        console.error('Error updating Google Sheet:', error);
    }
}

// Ejecutar la función cada x milisegundos (por ejemplo, cada 10 minutos)
// fetchDataFluxAndUpdateSheet()

updateGoogleSheet()