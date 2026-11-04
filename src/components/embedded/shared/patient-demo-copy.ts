export const APPOINTMENT_COPY = {
  dock: {
    usersLabel: "View as",
    usersTitle: "Try the appointment form as another patient",
    editLabel: "Edit patient details",
    editTitle: "Change the patient details used to fill in the appointment form",
  },
  dialog: {
    showEditorTitle: false,
    editorNote: "This editor is also a SurveyJS form.",
    title: "Patient details",
    description:
      "Change patient details to see how the appointment form updates.",
  },
  descriptions: {
    "Maria Delgado": "Saved details · prescription refills",
    "Daniel Okafor": "Medicare · different visit costs and referral requirements",
    "Priya Raman": "New patient · additional registration questions",
  },
} as const;

export const ENCOUNTER_NOTE_COPY = {
  dock: {
    usersLabel: "Select patient",
    usersTitle: "Choose the patient whose encounter note you want to view",
    editLabel: "Edit patient details",
    editTitle: "Change the patient details used to prepare the encounter note",
  },
  dialog: {
    showEditorTitle: false,
    editorNote: "This editor is also a SurveyJS form.",
    title: "Patient details",
    description:
      "Change patient details to see how the encounter note updates.",
  },
  descriptions: {
    "Maria Delgado": "Interpreter needed · existing diagnoses and medications",
    "Daniel Okafor": "Former smoker · tobacco counselling question",
    "Priya Raman": "New patient · additional first-visit page",
  },
} as const;
