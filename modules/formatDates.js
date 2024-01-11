function convertDateToISO(dateString) {
    // Sépare la date en [jour, mois, année]
    var parts = dateString.split("/");

    // Réorganise en format ISO (YYYY-MM-DD)
    var isoFormattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

    return isoFormattedDate;
}

module.exports = convertDateToISO