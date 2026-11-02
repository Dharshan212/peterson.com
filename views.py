import os

from flask import Blueprint, current_app, render_template, send_from_directory

views = Blueprint('views', __name__)


@views.route('/')
@views.route('/index.html')
def home():
    return render_template('index.html')


@views.route('/about.html')
def about():
    return render_template('about.html')


@views.route('/skills.html')
def skills():
    return render_template('skills.html')


@views.route('/research.html')
def research():
    return render_template('research.html')


@views.route('/bluepad32-thesis.html')
def bluepad32_thesis():
    return send_from_directory(
        os.path.join(current_app.root_path, 'templates'),
        'bluepad32-thesis.html',
        mimetype='text/html',
    )


@views.route('/assets/bluepad32-thesis/<path:filename>')
def bluepad32_thesis_asset(filename):
    return send_from_directory(
        os.path.join(current_app.root_path, 'templates', 'assets', 'bluepad32-thesis'),
        filename,
    )


@views.route('/anesthesia-control-research.html')
def anesthesia_control_research():
    return send_from_directory(
        os.path.join(current_app.root_path, 'templates'),
        'anesthesia-control-research.html',
        mimetype='text/html',
    )


@views.route('/assets/anesthesia-control/<path:filename>')
def anesthesia_control_asset(filename):
    return send_from_directory(
        os.path.join(current_app.root_path, 'templates', 'assets', 'anesthesia-control'),
        filename,
    )


@views.route('/publications.html')
def publications():
    return render_template('publications.html')


@views.route('/contact.html')
def contact():
    return render_template('contact.html')


@views.route('/myelin-hub.html')
def myelin_hub():
    return render_template('myelin-hub.html')


@views.route('/myelin_v2_mockup_2.html')
def myelin_demo():
    return render_template('myelin_v2_mockup_2.html')


@views.route('/myelin_web_sample.html')
def myelin_web_sample():
    # Served as a plain file, not through Jinja: this page is a large
    # self-contained HTML/JS app and must reach the browser byte-for-byte.
    return send_from_directory(
        os.path.join(current_app.root_path, 'templates'),
        'myelin_web_sample.html',
        mimetype='text/html',
        max_age=0,
    )
