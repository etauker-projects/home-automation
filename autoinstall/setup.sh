#!/bin/bash


USER_INPUT=""

# Function to download gist content
download_gist() {
    local gist_url="$1"
    local output_file="$2"

    echo "Downloading from: $gist_url"
    # echo "Saving to: $output_file"

    if ! curl -sSL "$gist_url" -o "$output_file" 2>&1; then
        echo "Error: Failed to download gist from $gist_url"
        return 1
    fi

    if [ ! -s "$output_file" ]; then
        echo "Error: Downloaded file is empty"
        return 1
    fi

    # echo "Download successful"
}

# Function to extract unique placeholders from file
extract_placeholders() {
    local input_file="$1"
    # Find all ${PLACEHOLDER} patterns, sort unique, remove ${} wrapper
    grep -o '\${[A-Z_]*}' "$input_file" | sort -u | sed 's/\${//;s/}//'
}

# Function to get user input for a placeholder
get_user_input() {
    USER_INPUT=""
    local placeholder="$1"
    local value=""

    while [ -z "$value" ]; do
        printf "Enter value for %s: " "$placeholder"

        if [[ "$placeholder" == *PASSWORD* ]]; then
            read -s value
        else
            read value
        fi


        if [ -z "$value" ]; then
            echo "Value cannot be empty. Please try again."
        fi
    done

    USER_INPUT="$value"
}

# Function to replace placeholders in file
replace_placeholders() {
    local input_file="$1"
    local output_file="$2"
    local temp_file=$(mktemp)

    # Create initial copy
    cp "$input_file" "$temp_file"

    placeholders=$(extract_placeholders "$input_file")

    # Process each placeholder and get user input
    for placeholder in $placeholders; do
        get_user_input "$placeholder"

        # If placeholder is USER_*_PASSWORD then hash the password before replacing
        if [[ "$placeholder" == USER_* && "$placeholder" == *_PASSWORD ]]; then
            value=`echo "$USER_INPUT" | openssl passwd -noverify -stdin`
        else
            value=$USER_INPUT
        fi

        # Escape special characters in value to prevent sed issues
        escaped_value=$(printf '%s\n' "$value" | sed 's/[\&/]/\\&/g')
        sed -i.bak "s/\${$placeholder}/$escaped_value/g" "$temp_file"
    done

    # Move processed file to output location
    mv "$temp_file" "$output_file"
}

# Main script
main() {
    local default_gist="https://gist.githubusercontent.com/etauker/66351b98f49d17dc91c2fe648e6396ce/raw/autoinstall.yaml"
    local output_file="${1:-autoinstall.yaml}"
    local gist_url="${2:-$default_gist}"
    local downloaded_file=$(mktemp)

    echo "Downloading gist..."
    download_gist "$gist_url" "$downloaded_file"
    echo ""

    echo "Processing placeholders..."
    replace_placeholders "$downloaded_file" "$output_file"
    echo ""

    echo "Cleaning up temp files..."
    rm -f "$downloaded_file" "$downloaded_file.bak"
    echo ""

    echo "Done! Processed file saved as: $output_file"
}

# Execute main function
main "$@"
