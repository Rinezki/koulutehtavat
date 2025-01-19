function submitForm(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    alert(`Kiitos, ${name}, että otit yhteyttä!`);
}